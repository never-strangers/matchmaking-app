import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
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
  await supabase.from("match_reveal_queue").delete().eq("event_id", eventId);
  await supabase.from("match_results").delete().eq("event_id", eventId);
  await supabase.from("match_rounds").delete().eq("event_id", eventId);
  await supabase.from("match_runs").delete().eq("event_id", eventId);

  return Response.json({ ok: true });
}
