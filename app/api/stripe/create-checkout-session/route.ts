import { NextRequest } from "next/server";
import Stripe from "stripe";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export async function POST(req: NextRequest) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;
  const profileId = auth.profile_id;

  let body: { event_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventId = typeof body.event_id === "string" ? body.event_id.trim() : null;
  if (!eventId) {
    return new Response(JSON.stringify({ error: "event_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getServiceSupabaseClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, price_cents, currency, payment_required")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return new Response(JSON.stringify({ error: "Event not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const priceCents = Number((event as { price_cents?: number }).price_cents ?? 0);
  const paymentRequired = (event as { payment_required?: boolean }).payment_required !== false;

  if (!paymentRequired) {
    return new Response(
      JSON.stringify({ error: "This event does not require payment" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Ensure attendee row exists (create on first checkout for paid events)
  let attendeeRow: { id: string; event_id: string; profile_id: string; payment_status: string; ticket_type_id: string | null } | null = null;
  const { data: attendee, error: attendeeError } = await supabase
    .from("event_attendees")
    .select("id, event_id, profile_id, payment_status, ticket_type_id")
    .eq("event_id", eventId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (attendeeError) {
    return new Response(
      JSON.stringify({ error: "Failed to load attendance" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (attendee) {
    attendeeRow = {
      id: attendee.id,
      event_id: attendee.event_id,
      profile_id: attendee.profile_id,
      payment_status: (attendee as { payment_status?: string }).payment_status ?? "unpaid",
      ticket_type_id: (attendee as { ticket_type_id?: string | null }).ticket_type_id ?? null,
    };
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("event_attendees")
      .insert({
        event_id: eventId,
        profile_id: profileId,
        joined_at: new Date().toISOString(),
        payment_status: "unpaid",
      })
      .select("id")
      .single();
    if (insertErr || !inserted) {
      console.error("Failed to create attendee for checkout:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to reserve your spot" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    attendeeRow = {
      id: inserted.id,
      event_id: eventId,
      profile_id: profileId,
      payment_status: "unpaid",
      ticket_type_id: null,
    };
  }

  const status = attendeeRow.payment_status;
  if (status === "paid") {
    return new Response(
      JSON.stringify({ error: "Already paid" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let chargeCents = priceCents;
  const ticketTypeId = attendeeRow.ticket_type_id;
  if (ticketTypeId) {
    const { data: ticketType } = await supabase
      .from("event_ticket_types")
      .select("price_cents, currency")
      .eq("id", ticketTypeId)
      .single();
    if (ticketType) {
      chargeCents = Number((ticketType as { price_cents?: number }).price_cents ?? 0);
      const ticketCurrency = (ticketType as { currency?: string }).currency;
      if (ticketCurrency) {
        (event as { currency?: string }).currency = ticketCurrency;
      }
    }
  }
  const currency = ((event as { currency?: string }).currency || "sgd").toLowerCase();
  if (chargeCents <= 0) {
    return new Response(
      JSON.stringify({ error: "No price set for your ticket. Contact support." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const minCents = currency === "sgd" || currency === "usd" ? 50 : 50;
  if (chargeCents < minCents) {
    return new Response(
      JSON.stringify({
        error: `Amount must be at least ${minCents / 100} ${currency.toUpperCase()} (Stripe minimum).`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  let session: Stripe.Checkout.Session;
  try {
    const stripe = getStripe();
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: currency,
            unit_amount: chargeCents,
            product_data: {
              name: `Event: ${(event as { title?: string }).title || "Event"}`,
              description: "Confirm your seat",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/events/${eventId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/events/${eventId}/payment/canceled`,
      metadata: {
        event_id: eventId,
        attendee_id: attendeeRow.id,
        profile_id: profileId,
      },
      client_reference_id: `${eventId}:${profileId}`,
    });
  } catch (err) {
    console.error("Stripe checkout session create error:", err);
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : "Failed to create checkout session";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { error: updateError } = await supabase
    .from("event_attendees")
    .update({
      payment_status: "checkout_created",
      stripe_checkout_session_id: session.id,
    })
    .eq("event_id", eventId)
    .eq("profile_id", profileId);

  if (updateError) {
    console.error("Failed to update attendee with session id:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to record checkout" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return Response.json({ url: session.url });
}
