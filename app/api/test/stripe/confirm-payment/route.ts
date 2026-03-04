import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/adminClient";

/**
 * E2E-only: mark an attendee as paid (simulate Stripe webhook success).
 * Uses service role server-side; guarded by E2E_TEST_MODE and x-e2e-secret.
 * Enables deterministic E2E without Stripe Checkout UI (Option B).
 * Enable: E2E_TEST_MODE=true and E2E_SHARED_SECRET in env.
 */
type ConfirmPaymentBody = {
  attendee_id?: string;
  event_id?: string;
  profile_id?: string;
};

function isE2EEnabled(): boolean {
  return (
    process.env.E2E_TEST_MODE === "true" &&
    typeof process.env.E2E_SHARED_SECRET === "string" &&
    process.env.E2E_SHARED_SECRET.length > 0
  );
}

export async function POST(request: Request) {
  if (!isE2EEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const expectedSecret = process.env.E2E_SHARED_SECRET;
  const actualSecret = request.headers.get("x-e2e-secret");
  if (!expectedSecret || !actualSecret || actualSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: ConfirmPaymentBody;
  try {
    body = (await request.json()) as ConfirmPaymentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const attendeeId = typeof body.attendee_id === "string" ? body.attendee_id.trim() : "";
  const eventId = typeof body.event_id === "string" ? body.event_id.trim() : "";
  const profileId = typeof body.profile_id === "string" ? body.profile_id.trim() : "";

  if (attendeeId) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_attendees")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", attendeeId)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Attendee not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, attendee_id: attendeeId, payment_status: "paid" });
  }

  if (eventId && profileId) {
    const supabase = createAdminClient();
    const { data: row, error: fetchErr } = await supabase
      .from("event_attendees")
      .select("id")
      .eq("event_id", eventId)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json(
        { error: fetchErr?.message ?? "Attendee not found for this event and profile." },
        { status: 404 }
      );
    }

    const { error: updateErr } = await supabase
      .from("event_attendees")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", (row as { id: string }).id);

    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message ?? "Failed to update payment." },
        { status: 500 }
      );
    }
    return NextResponse.json({
      ok: true,
      attendee_id: (row as { id: string }).id,
      payment_status: "paid",
    });
  }

  return NextResponse.json(
    { error: "Provide attendee_id or (event_id and profile_id)." },
    { status: 400 }
  );
}
