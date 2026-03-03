import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

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
  let body: { attendee_id: string; checked_in: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { attendee_id: attendeeId, checked_in } = body;
  if (typeof attendeeId !== "string" || typeof checked_in !== "boolean") {
    return new Response(
      JSON.stringify({ error: "attendee_id (string) and checked_in (boolean) required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = getServiceSupabaseClient();

  const { data: attendee, error: fetchError } = await supabase
    .from("event_attendees")
    .select("id, event_id, payment_status")
    .eq("id", attendeeId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (fetchError || !attendee) {
    return new Response(
      JSON.stringify({ error: "Attendee not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: eventRow } = await supabase
    .from("events")
    .select("payment_required, price_cents")
    .eq("id", eventId)
    .single();
  const paymentRequired =
    eventRow &&
    (eventRow as { payment_required?: boolean }).payment_required !== false &&
    Number((eventRow as { price_cents?: number }).price_cents ?? 0) > 0;
  const status = (attendee as { payment_status?: string }).payment_status ?? "unpaid";
  const canCheckIn = paymentRequired
    ? status === "paid"
    : status === "paid" || status === "free" || status === "not_required";
  if (!canCheckIn) {
    return new Response(
      JSON.stringify({ error: "Only paid (or free) attendees can be checked in" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const { error: updateError } = await supabase
    .from("event_attendees")
    .update({
      checked_in,
      checked_in_at: checked_in ? new Date().toISOString() : null,
      checked_in_by: checked_in ? session.profile_id : null,
    })
    .eq("id", attendeeId)
    .eq("event_id", eventId);

  if (updateError) {
    console.error("Check-in update error:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to update check-in" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return Response.json({ ok: true, checked_in });
}
