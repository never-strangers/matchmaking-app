import { NextRequest } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Webhook missing signature or STRIPE_WEBHOOK_SECRET");
    return new Response("Webhook config error", { status: 500 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  const { error: insertError } = await supabase.from("payment_events").insert({
    id: event.id,
    type: event.type,
    payload: event as unknown as object,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("payment_events insert error:", insertError);
    return new Response("Idempotency insert failed", { status: 500 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const eventId = session.metadata?.event_id;
      const profileId = session.metadata?.profile_id;

      if (!eventId || !profileId) {
        console.error("checkout.session.completed missing metadata", session.id);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent)?.id ?? null;

      const { error: updateErr } = await supabase
        .from("event_attendees")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq("event_id", eventId)
        .eq("profile_id", profileId);

      if (updateErr) {
        console.error("event_attendees update after checkout:", updateErr);
      }
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const eventId = session.metadata?.event_id;
      const profileId = session.metadata?.profile_id;
      if (eventId && profileId) {
        await supabase
          .from("event_attendees")
          .update({
            payment_status: "unpaid",
            stripe_checkout_session_id: null,
          })
          .eq("event_id", eventId)
          .eq("profile_id", profileId);
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string | null;
      if (!paymentIntentId) break;

      const { data: attendee } = await supabase
        .from("event_attendees")
        .select("event_id, profile_id")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .single();

      if (attendee) {
        await supabase
          .from("event_attendees")
          .update({ payment_status: "refunded" })
          .eq("event_id", attendee.event_id)
          .eq("profile_id", attendee.profile_id);
      }
      break;
    }
    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
