import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { enqueueEmail } from "@/lib/email/send";
import { rsvpConfirmationEmail } from "@/lib/email/templates";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, date, payment_required, price_cents")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single();

  const paymentRequired =
    event &&
    (event as { payment_required?: boolean }).payment_required !== false &&
    Number((event as { price_cents?: number }).price_cents ?? 0) > 0;

  const { error } = await supabase
    .from("event_attendees")
    .upsert(
      {
        event_id: eventId,
        profile_id: auth.profile_id,
        joined_at: new Date().toISOString(),
      },
      { onConflict: "event_id,profile_id", ignoreDuplicates: false }
    );

  if (error) {
    console.error("Error joining event:", error);
    return new Response("Failed to join event", { status: 500 });
  }

  if (!paymentRequired) {
    await supabase
      .from("event_attendees")
      .update({ payment_status: "free" })
      .eq("event_id", eventId)
      .eq("profile_id", auth.profile_id)
      .not("payment_status", "in", '("paid","checkout_created","free","refunded")');

    void (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, name")
          .eq("id", auth.profile_id)
          .maybeSingle();
        if (!profile?.email || profile.email.includes("@demo.local")) return;
        const firstName = (profile.name ?? "").split(" ")[0] ?? "";
        const eventTitle = (event as { title?: string })?.title ?? "an event";
        const eventDate = (event as { date?: string })?.date ?? "";
        await enqueueEmail(
          `rsvp-confirmed:${eventId}:${auth.profile_id}`,
          "rsvp_confirmed",
          profile.email,
          rsvpConfirmationEmail(firstName, eventTitle, eventDate)
        );
      } catch (err) {
        console.error("[email] rsvp confirmation error:", err);
      }
    })();
  }

  return Response.json({ ok: true });
}
