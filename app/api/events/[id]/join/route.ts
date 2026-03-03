import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

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
    .select("id, payment_required, price_cents")
    .eq("id", eventId)
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
        ...(paymentRequired ? {} : { payment_status: "free" }),
      },
      { onConflict: "event_id,profile_id" }
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
      .eq("profile_id", auth.profile_id);
  }

  return Response.json({ ok: true });
}

