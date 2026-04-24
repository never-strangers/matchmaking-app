import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const { id: eventId } = await context.params;
  let body: { ticket_type_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ticketTypeId = typeof body.ticket_type_id === "string" ? body.ticket_type_id.trim() : null;
  if (!ticketTypeId) {
    return new Response(JSON.stringify({ error: "ticket_type_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getServiceSupabaseClient();

  // ── Gender cap enforcement (Angelo model) ────────────────────────────────
  // Gender is read from the user profile, not inferred from ticket name.
  const [{ data: profile }, { data: event }] = await Promise.all([
    supabase.from("profiles").select("gender").eq("id", auth.profile_id).single(),
    supabase.from("events").select("max_males, max_females").eq("id", eventId).single(),
  ]);

  const userGender = (profile as { gender?: string } | null)?.gender?.toLowerCase() ?? null;
  const maxMales   = (event as { max_males?: number | null } | null)?.max_males   ?? null;
  const maxFemales = (event as { max_females?: number | null } | null)?.max_females ?? null;

  const capForUser =
    userGender === "male"   ? maxMales :
    userGender === "female" ? maxFemales :
    null;

  if (userGender && capForUser !== null) {
    // Count attendees of this gender who are reserved or paid for this event.
    // Two-step: get profile IDs of that gender, then count matching attendees.
    const { data: profilesOfGender } = await supabase
      .from("profiles")
      .select("id")
      .eq("gender", userGender);

    const profileIds = (profilesOfGender ?? []).map((p: { id: string }) => p.id);

    const { count: currentCount } = await supabase
      .from("event_attendees")
      .select("profile_id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .in("ticket_status", ["reserved", "paid"])
      .in("profile_id", profileIds);

    if ((currentCount ?? 0) >= capForUser) {
      // ── Gender cap hit → join waitlist ───────────────────────────────────
      const { data: existing } = await supabase
        .from("event_attendees")
        .select("id, ticket_status, waitlist_position")
        .eq("event_id", eventId)
        .eq("profile_id", auth.profile_id)
        .maybeSingle();

      if (existing && (existing as { ticket_status: string }).ticket_status === "waitlisted") {
        const pos = (existing as { waitlist_position?: number }).waitlist_position ?? 1;
        return Response.json({
          waitlisted: true,
          position: pos,
          message: `You're already on the waitlist at position #${pos}.`,
        });
      }

      // Next position for this gender's waitlist
      const { data: lastInQueue } = await supabase
        .from("event_attendees")
        .select("waitlist_position")
        .eq("event_id", eventId)
        .eq("waitlist_gender", userGender)
        .eq("ticket_status", "waitlisted")
        .order("waitlist_position", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition = ((lastInQueue as { waitlist_position?: number } | null)?.waitlist_position ?? 0) + 1;

      if (existing) {
        await supabase
          .from("event_attendees")
          .update({
            ticket_status: "waitlisted",
            waitlist_gender: userGender,
            waitlist_position: nextPosition,
            ticket_type_id: null,
            payment_status: "unpaid",
            stripe_checkout_session_id: null,
          })
          .eq("id", (existing as { id: string }).id);
      } else {
        await supabase.from("event_attendees").insert({
          event_id: eventId,
          profile_id: auth.profile_id,
          ticket_status: "waitlisted",
          waitlist_gender: userGender,
          waitlist_position: nextPosition,
          payment_status: "unpaid",
          joined_at: new Date().toISOString(),
        });
      }

      return Response.json({
        waitlisted: true,
        position: nextPosition,
        gender: userGender,
        message: `The ${userGender} spots are full. You've been added to the waitlist at position #${nextPosition}. We'll notify you if a spot opens up.`,
      });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { data: attendeeId, error } = await supabase.rpc("reserve_ticket", {
    p_event_id: eventId,
    p_ticket_type_id: ticketTypeId,
    p_profile_id: auth.profile_id,
  });

  if (error) {
    console.error("reserve_ticket error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to reserve ticket" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  return Response.json({ ok: true, attendee_id: attendeeId });
}
