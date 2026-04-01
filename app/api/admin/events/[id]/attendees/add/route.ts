import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

const VALID_PAYMENT_STATES = ["paid", "pending", "free"] as const;
type PaymentState = (typeof VALID_PAYMENT_STATES)[number];

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId } = await context.params;

  let body: { profile_id: string; payment_state: PaymentState };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { profile_id, payment_state } = body;
  if (!profile_id || typeof profile_id !== "string") {
    return Response.json({ error: "profile_id (string) is required" }, { status: 400 });
  }
  if (!payment_state || !VALID_PAYMENT_STATES.includes(payment_state)) {
    return Response.json({ error: "payment_state must be paid | pending | free" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  // Verify profile is approved
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, status, name, full_name")
    .eq("id", profile_id)
    .maybeSingle();

  if (profileErr || !profile) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  if (profile.status !== "approved") {
    return Response.json({ error: "User is not approved" }, { status: 400 });
  }

  // Verify event exists
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr || !event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  // Resolve payment fields
  // payment_status enum: unpaid | checkout_created | paid | canceled | refunded
  // ticket_status enum: reserved | paid | canceled | expired
  const now = new Date().toISOString();
  const isPaid = payment_state === "paid" || payment_state === "free";

  const paymentFields = isPaid
    ? { payment_status: "paid", ticket_status: "paid", paid_at: now }
    : { payment_status: "unpaid", ticket_status: "reserved" };

  // Check if attendee row already exists
  const { data: existing } = await supabase
    .from("event_attendees")
    .select("id, payment_status, ticket_status")
    .eq("event_id", eventId)
    .eq("profile_id", profile_id)
    .maybeSingle();

  let attendeeResult: Record<string, unknown>;

  if (existing) {
    // Update payment/ticket status only (never touch stripe fields)
    const { data: updated, error: updateErr } = await supabase
      .from("event_attendees")
      .update(paymentFields)
      .eq("event_id", eventId)
      .eq("profile_id", profile_id)
      .select("id, payment_status, ticket_status, checked_in")
      .single();

    if (updateErr) {
      console.error("[attendees/add] update error:", updateErr);
      return Response.json({ error: updateErr.message }, { status: 500 });
    }
    attendeeResult = { ...updated, already_existed: true };
  } else {
    // Insert new attendee row
    const { data: inserted, error: insertErr } = await supabase
      .from("event_attendees")
      .insert({
        event_id: eventId,
        profile_id,
        joined_at: now,
        ...paymentFields,
      })
      .select("id, payment_status, ticket_status, checked_in")
      .single();

    if (insertErr) {
      console.error("[attendees/add] insert error:", insertErr);
      return Response.json({ error: insertErr.message }, { status: 500 });
    }
    attendeeResult = { ...inserted, already_existed: false };
  }

  return Response.json({ ok: true, attendee: attendeeResult });
}
