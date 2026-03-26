import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { enqueueEmail } from "@/lib/email/send";
import { matchesRevealedEmail } from "@/lib/email/templates";

type Round = 1 | 2 | 3;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  let body: { round?: number };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const round = body.round;
  if (round !== 1 && round !== 2 && round !== 3) {
    return new Response(
      JSON.stringify({ error: "Body must include round: 1, 2, or 3" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { count: computedCount } = await supabase
    .from("match_results")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("round", round);
  if (computedCount === 0) {
    return new Response(
      JSON.stringify({ error: "Compute round first. Run matching to compute this round." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: existing, error: fetchError } = await supabase
    .from("match_rounds")
    .select("event_id, round1_revealed_at, round2_revealed_at, round3_revealed_at, last_revealed_round")
    .eq("event_id", eventId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching match_rounds:", fetchError);
    return new Response("Failed to load reveal state", { status: 500 });
  }

  const now = new Date().toISOString();
  const roundCol = `round${round}_revealed_at` as const;
  const alreadyRevealed = existing?.[roundCol];

  if (alreadyRevealed) {
    const { count } = await supabase
      .from("match_results")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("round", round);
    return Response.json({
      ok: true,
      round,
      alreadyRevealed: true,
      pairsInRound: count ?? 0,
      lastRevealedRound: Math.max(existing?.last_revealed_round ?? 0, round),
    });
  }

  const newLastRevealed = Math.max(existing?.last_revealed_round ?? 0, round);

  if (existing) {
    const { error: updateError } = await supabase
      .from("match_rounds")
      .update({
        [roundCol]: now,
        updated_at: now,
        last_revealed_round: newLastRevealed,
      })
      .eq("event_id", eventId);

    if (updateError) {
      console.error("Error updating match_rounds:", updateError);
      return new Response("Failed to reveal round", { status: 500 });
    }
  } else {
    const { error: insertError } = await supabase.from("match_rounds").insert({
      event_id: eventId,
      round1_revealed_at: round === 1 ? now : null,
      round2_revealed_at: round === 2 ? now : null,
      round3_revealed_at: round === 3 ? now : null,
      last_revealed_round: newLastRevealed,
      updated_at: now,
    });

    if (insertError) {
      console.error("Error inserting match_rounds:", insertError);
      return new Response("Failed to reveal round", { status: 500 });
    }
  }

  const { data: pairs, error: pairsError } = await supabase
    .from("match_results")
    .select("id, a_profile_id, b_profile_id")
    .eq("event_id", eventId)
    .eq("round", round);

  if (!pairsError && pairs && pairs.length > 0) {
    const matchResultIds = pairs.map((r: { id: string }) => r.id);
    const { data: existingConvos } = await supabase
      .from("conversations")
      .select("match_result_id")
      .in("match_result_id", matchResultIds);
    const existingMatchIds = new Set(
      (existingConvos || []).map((c: { match_result_id: string }) => c.match_result_id)
    );

    const newPairs = (pairs as { id: string; a_profile_id: string; b_profile_id: string }[])
      .filter((row) => !existingMatchIds.has(row.id));

    if (newPairs.length > 0) {
      const convosToInsert = newPairs.map((row) => ({
        event_id: eventId,
        match_result_id: row.id,
        user_a_id: String(row.a_profile_id),
        user_b_id: String(row.b_profile_id),
      }));

      const { data: insertedConvos } = await supabase
        .from("conversations")
        .insert(convosToInsert)
        .select("id");

      if (insertedConvos && insertedConvos.length > 0) {
        const messagesToInsert = insertedConvos.map((c: { id: string }) => ({
          conversation_id: c.id,
          sender_id: null,
          kind: "system",
          body: "You\u2019ve been matched. Say hi \uD83D\uDC4B",
        }));
        await supabase.from("messages").insert(messagesToInsert);
      }
    }

    // Fire-and-forget: notify all matched participants via email
    void (async () => {
      try {
        const profileIds = new Set<string>();
        for (const p of pairs as { a_profile_id: string; b_profile_id: string }[]) {
          profileIds.add(String(p.a_profile_id));
          profileIds.add(String(p.b_profile_id));
        }
        const ids = Array.from(profileIds);
        const [profilesRes, eventRes] = await Promise.all([
          supabase.from("profiles").select("id, email, name").in("id", ids),
          supabase.from("events").select("title").eq("id", eventId).maybeSingle(),
        ]);
        const eventTitle = (eventRes.data as { title?: string })?.title ?? "an event";
        const profileMap = new Map(
          (profilesRes.data || []).map((p: { id: string; email: string; name: string }) => [p.id, p])
        );

        // Count matches per profile in this round
        const matchCounts = new Map<string, number>();
        for (const p of pairs as { a_profile_id: string; b_profile_id: string }[]) {
          const a = String(p.a_profile_id);
          const b = String(p.b_profile_id);
          matchCounts.set(a, (matchCounts.get(a) ?? 0) + 1);
          matchCounts.set(b, (matchCounts.get(b) ?? 0) + 1);
        }

        const emailPromises: Promise<void>[] = [];
        for (const [pid, count] of matchCounts) {
          const profile = profileMap.get(pid) as { email?: string; name?: string } | undefined;
          if (!profile?.email || profile.email.includes("@demo.local")) continue;
          const firstName = (profile.name ?? "").split(" ")[0] ?? "";
          emailPromises.push(
            enqueueEmail(
              `matches-revealed:${eventId}:r${round}:${pid}`,
              "matches_revealed",
              profile.email,
              matchesRevealedEmail(firstName, eventTitle, count)
            )
          );
        }
        await Promise.all(emailPromises);
      } catch (err) {
        console.error("[email] matches revealed notification error:", err);
      }
    })();
  }

  const { count } = await supabase
    .from("match_results")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("round", round);

  return Response.json({
    ok: true,
    round,
    alreadyRevealed: false,
    pairsInRound: count ?? 0,
    lastRevealedRound: newLastRevealed,
  });
}
