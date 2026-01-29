import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  const { error } = await supabase
    .from("event_attendees")
    .upsert(
      {
        event_id: eventId,
        profile_id: session.profile_id,
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

