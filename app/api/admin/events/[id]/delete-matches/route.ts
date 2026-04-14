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

  // Delete only matching and reveal artifacts — attendees, answers, and likes are preserved
  const [matchResults, matchRounds, matchRuns, matchRevealQueue] = await Promise.all([
    supabase.from("match_results").delete().eq("event_id", eventId).select("id"),
    supabase.from("match_rounds").delete().eq("event_id", eventId).select("event_id"),
    supabase.from("match_runs").delete().eq("event_id", eventId).select("id"),
    supabase.from("match_reveal_queue").delete().eq("event_id", eventId).select("id"),
  ]);

  return Response.json({
    ok: true,
    deleted: {
      match_results: matchResults.data?.length ?? 0,
      match_rounds: matchRounds.data?.length ?? 0,
      match_runs: matchRuns.data?.length ?? 0,
      match_reveal_queue: matchRevealQueue.data?.length ?? 0,
    },
  });
}
