import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

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
