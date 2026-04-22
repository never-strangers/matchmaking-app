import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { enqueueEmail } from "@/lib/email/send";
import { loadTemplate } from "@/lib/email/templateLoader";

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
    .select("id, status, name, full_name, email")
    .eq("id", profile_id)
    .maybeSingle();

  if (profileErr || !profile) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  if (profile.status !== "approved") {
    return Response.json({ error: "User is not approved" }, { status: 400 });
  }

  // Verify event exists (fetch details needed for RSVP email)
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, title, start_at, end_at, description")
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr || !event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  // Resolve payment fields
  const now = new Date().toISOString();

  const paymentFields =
    payment_state === "paid"
      ? { payment_status: "paid",   ticket_status: "paid",     paid_at: now }
      : payment_state === "free"
      ? { payment_status: "free",   ticket_status: "reserved"              }
      : /* pending */
        { payment_status: "unpaid", ticket_status: "reserved"              };

  // Check if attendee row already exists
  const { data: existing } = await supabase
    .from("event_attendees")
    .select("id, payment_status, ticket_status")
    .eq("event_id", eventId)
    .eq("profile_id", profile_id)
    .maybeSingle();

  let attendeeResult: Record<string, unknown>;
  const isNew = !existing;

  if (existing) {
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

  // Send RSVP confirmation only for newly added attendees (never payment confirmation)
  if (isNew) {
    void (async () => {
      try {
        const email = (profile as { email?: string }).email;
        if (!email || email.includes("@demo.local")) return;

        const ev = event as { title?: string; start_at?: string; end_at?: string; description?: string };
        const nameParts = ((profile as { name?: string; full_name?: string }).name ?? (profile as { full_name?: string }).full_name ?? "").split(" ");
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.slice(1).join(" ");
        const eventTitle = ev.title ?? "";
        const eventDate = ev.start_at
          ? new Date(ev.start_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
          : "";
        const eventStartTime = ev.start_at
          ? new Date(ev.start_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          : "";
        const eventEndTime = ev.end_at
          ? new Date(ev.end_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          : "";
        const eventDescription = ev.description ?? "";

        const tpl = await loadTemplate("rsvp_confirmation", {
          first_name: firstName,
          last_name: lastName,
          event_title: eventTitle,
          event_date: eventDate,
          event_start_time: eventStartTime,
          event_end_time: eventEndTime,
          event_description: eventDescription,
        });
        await enqueueEmail(
          `rsvp-confirmed:${eventId}:${profile_id}`,
          "rsvp_confirmation",
          email,
          tpl
        );
      } catch (err) {
        console.error("[email] admin-add rsvp confirmation error:", err);
      }
    })();
  }

  return Response.json({ ok: true, attendee: attendeeResult });
}
