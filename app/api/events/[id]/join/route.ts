import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { enqueueEmail } from "@/lib/email/send";
import { loadTemplate } from "@/lib/email/templateLoader";

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
        const nameParts = (profile.name ?? "").split(" ");
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.slice(1).join(" ");
        const ev = event as { title?: string; date?: string; start_at?: string; end_at?: string; description?: string };
        const eventTitle = ev?.title ?? "an event";
        const eventDate = ev?.date ?? (ev?.start_at ? new Date(ev.start_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "");
        const eventStartTime = ev?.start_at ? new Date(ev.start_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
        const eventEndTime = ev?.end_at ? new Date(ev.end_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
        const eventDescription = ev?.description ?? "";
        const tpl = await loadTemplate("rsvp_confirmation", { first_name: firstName, last_name: lastName, event_title: eventTitle, event_date: eventDate, event_start_time: eventStartTime, event_end_time: eventEndTime, event_description: eventDescription });
        await enqueueEmail(`rsvp-confirmed:${eventId}:${auth.profile_id}`, "rsvp_confirmation", profile.email, tpl);
      } catch (err) {
        console.error("[email] rsvp confirmation error:", err);
      }
    })();
  }

  return Response.json({ ok: true });
}
