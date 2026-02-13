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

  const { error } = await supabase
    .from("event_attendees")
    .upsert(
      {
        event_id: eventId,
        profile_id: auth.profile_id,
        joined_at: new Date().toISOString(),
      },
      { onConflict: "event_id,profile_id" }
    );

  if (error) {
    console.error("Error joining event:", error);
    return new Response("Failed to join event", { status: 500 });
  }

  return Response.json({ ok: true });
}

