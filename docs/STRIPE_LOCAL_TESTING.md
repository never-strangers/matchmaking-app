# Stripe Payment — Local Testing

This doc describes how to test Stripe per-event payment locally using **Stripe CLI** to forward webhooks (no ngrok required).

## Prerequisites

- [Stripe CLI](https://stripe.com/docs/stripe-cli) installed (`brew install stripe/stripe-cli/stripe` or [download](https://github.com/stripe/stripe-cli/releases))
- Stripe account in **test mode**
- App running locally: `npm run dev` (e.g. `http://localhost:3000`)

## 1. Environment variables

Add to `.env.local` (use **test** keys from [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys)):

```bash
# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # From step 2 below
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Do **not** commit real keys. The webhook secret for local forwarding is provided by the Stripe CLI when you run `stripe listen`.

## 2. Forward webhooks to your app

In a **separate terminal**, run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

You’ll see something like:

```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxx (^C to quit)
```

Copy that `whsec_...` value into `.env.local` as `STRIPE_WEBHOOK_SECRET`, then restart your Next.js dev server so it picks up the new secret.

## 3. Run the app

```bash
npm run dev
```

Leave `stripe listen` running in the other terminal so webhooks are forwarded.

## 4. Trigger a test checkout

**Flow: Pay first → then complete questions.** For paid events, users cannot access the questionnaire until payment is complete.

1. Log in as an **approved** user.
2. Create an event (as admin) with **Payment required** checked and **Price (SGD cents)** &gt; 0 (e.g. `5000` for 50.00 SGD).
3. From the events list, click **Enter Event** (or open the event), then in the preview modal click **Continue to payment**. Or on the event detail page click **Pay to confirm**.
4. You’ll be redirected to Stripe Checkout. Use test card: `4242 4242 4242 4242`, any future expiry, any CVC, any postal code.
5. After payment, you’ll land on the payment success page; the app will poll attendance and then redirect to **Questions** for that event. Complete the questionnaire.
6. For **free events**, `payment_status` is set to `free` on join; users can go straight to questions. Admin guest list shows “Free” for those attendees.

## 5. Simulate webhook events (optional)

With `stripe listen` running, you can trigger events manually:

```bash
# After a test payment, get the checkout session ID from the success URL or Stripe Dashboard
stripe trigger checkout.session.completed

# Or with a specific session (for more control, use Dashboard or API to get session id)
stripe trigger charge.refunded
```

Idempotency is handled via the `payment_events` table (Stripe event ID); duplicate webhook deliveries are safe.

## 6. Refunds (admin)

Admins can issue refunds in the [Stripe Dashboard](https://dashboard.stripe.com/test/payments) (test mode). The app listens for `charge.refunded` and sets the attendee’s `payment_status` to `refunded`.

## Security notes (enforced in this app)

- **Price** is always read from `events.price_cents` on the server; the client never sends the amount.
- **Paid state** is only set by the Stripe webhook handler (after signature verification), never by the client.
- **Idempotency**: every webhook event is stored in `payment_events` by Stripe event ID; duplicates return 200 without re-applying.
- **Checkout metadata** includes `event_id`, `attendee_id`, and `profile_id`; fulfillment uses these to update the correct attendee. The attendee row is created when the user starts checkout if it does not exist.
- **RLS / trigger**: direct client updates to `event_attendees.payment_status` (and Stripe-related fields) are blocked by a DB trigger when using the anon key.
