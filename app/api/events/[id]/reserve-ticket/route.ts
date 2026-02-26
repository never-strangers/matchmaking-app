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
