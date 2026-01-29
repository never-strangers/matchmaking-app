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
  if (session.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  // Purge all event-related data so "Joined users" is empty and people can join again
  await supabase.from("likes").delete().eq("event_id", eventId);
  await supabase.from("answers").delete().eq("event_id", eventId);
  await supabase.from("event_attendees").delete().eq("event_id", eventId);
  await supabase.from("match_results").delete().eq("event_id", eventId);
  await supabase.from("match_runs").delete().eq("event_id", eventId);

  return Response.json({ ok: true });
}
