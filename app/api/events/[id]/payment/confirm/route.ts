import { NextRequest } from "next/server";
import Stripe from "stripe";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

/**
 * GET /api/events/[id]/payment/confirm?session_id=cs_xxx
 *
 * When the user lands on the payment success page with a checkout session_id,
 * we fetch the session from Stripe and, if payment is complete, update
 * event_attendees to paid. This covers the case where the webhook has not yet
 * run (e.g. local dev without stripe listen, or webhook delay).
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const eventId = (await context.params).id;
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId?.startsWith("cs_")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid session_id" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error("Stripe session retrieve error:", err);
    return new Response(
      JSON.stringify({ error: "Invalid checkout session" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const metaEventId = session.metadata?.event_id;
  const metaProfileId = session.metadata?.profile_id;
  if (metaEventId !== eventId || metaProfileId !== auth.profile_id) {
    return new Response(
      JSON.stringify({ error: "Session does not match this event or user" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (session.payment_status !== "paid") {
    return Response.json({
      payment_status: session.payment_status ?? "unpaid",
      paid_at: null,
    });
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent)?.id ?? null;

  const supabase = getServiceSupabaseClient();
  const { error: updateErr } = await supabase
    .from("event_attendees")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("event_id", eventId)
    .eq("profile_id", auth.profile_id);

  if (updateErr) {
    console.error("payment/confirm: event_attendees update error:", updateErr);
    return new Response(
      JSON.stringify({ error: "Failed to confirm payment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return Response.json({
    payment_status: "paid",
    paid_at: new Date().toISOString(),
  });
}
