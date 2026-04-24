import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

const isFemaleTicket = (name: string) => /female/i.test(name);
const isMaleTicket   = (name: string) => /\bmale\b/i.test(name) && !/female/i.test(name);

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

  // ── Gender cap enforcement ────────────────────────────────────────────────
  // 1. Load the ticket type name + the event's gender caps
  const [{ data: ticketType }, { data: event }] = await Promise.all([
    supabase.from("event_ticket_types").select("name").eq("id", ticketTypeId).single(),
    supabase.from("events").select("max_males, max_females").eq("id", eventId).single(),
  ]);

  if (ticketType && event) {
    const name = ticketType.name as string;
    const maxMales   = (event as { max_males?: number | null }).max_males ?? null;
    const maxFemales = (event as { max_females?: number | null }).max_females ?? null;

    const isM = isMaleTicket(name);
    const isF = isFemaleTicket(name);

    if ((isM && maxMales !== null) || (isF && maxFemales !== null)) {
      // Count currently reserved/paid attendees for this gender across all ticket types
      const { data: allTicketTypes } = await supabase
        .from("event_ticket_types")
        .select("id, name")
        .eq("event_id", eventId);

      const genderTicketIds = (allTicketTypes || [])
        .filter(t => isM ? isMaleTicket(t.name) : isFemaleTicket(t.name))
        .map(t => t.id);

      if (genderTicketIds.length > 0) {
        const { count } = await supabase
          .from("event_attendees")
          .select("profile_id", { count: "exact", head: true })
          .eq("event_id", eventId)
          .in("ticket_type_id", genderTicketIds)
          .in("ticket_status", ["reserved", "paid"]);

        const cap = isM ? maxMales! : maxFemales!;
        if ((count ?? 0) >= cap) {
          const gender = isM ? "male" : "female";
          return new Response(
            JSON.stringify({ error: `Sorry, the ${gender} spots are full for this event.` }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }
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
