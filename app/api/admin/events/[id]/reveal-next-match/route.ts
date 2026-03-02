import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

type RevealNextMatchResult = {
  queue_id: string;
  match_result_id: string;
  reveal_order: number;
  a_profile_id: string;
  b_profile_id: string;
  score: number;
};

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

  // Ensure there is a completed match run for this event
  const { data: runRow, error: runError } = await supabase
    .from("match_runs")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "done")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runError) {
    console.error("Error loading match_runs:", runError);
    return new Response("Failed to load matching state", { status: 500 });
  }
  if (!runRow) {
    return new Response("Matching not run for this event", { status: 400 });
  }

  const { data, error } = await supabase.rpc("reveal_next_match_for_event", {
    p_event_id: eventId,
    p_admin_profile_id: session.profile_id,
  });

  if (error) {
    console.error("Error in reveal_next_match_for_event:", error);
    return new Response("Failed to reveal next match", { status: 500 });
  }

  const rows = (data || []) as RevealNextMatchResult[];
  if (!rows.length) {
    return Response.json({
      revealed: null,
      message: "No more matches to reveal for this event",
    });
  }

  const row = rows[0];

  return Response.json({
    revealed: {
      matchResultId: row.match_result_id,
      aProfileId: row.a_profile_id,
      bProfileId: row.b_profile_id,
      revealOrder: row.reveal_order,
      score: Number(row.score),
    },
  });
}

