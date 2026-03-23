import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { getExplanationsForPair } from "@/lib/matching/questionnaireMatch";
import { loadEventQuestionsAndAnswers } from "@/lib/matching/loadEventQuestions";

export type RevealStatePayload = {
  revealedCount: number;
  totalCount: number;
  nextMatch: RevealMatchPayload | null;
  revealedMatches: RevealMatchPayload[];
};

export type RevealMatchPayload = {
  matchResultId: string;
  conversationId: string | null;
  otherProfileId: string;
  displayName: string;
  score: number;
  aligned: string[];
  mismatched: string[];
  instagramSharedByMe?: boolean;
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  const { data: attendee } = await supabase
    .from("event_attendees")
    .select("profile_id")
    .eq("event_id", eventId)
    .eq("profile_id", auth.profile_id)
    .maybeSingle();

  if (!attendee) {
    return new Response(
      JSON.stringify({ error: "Not an attendee of this event" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: runRow } = await supabase
    .from("match_runs")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "done")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!runRow) {
    return Response.json({
      revealedCount: 0,
      totalCount: 0,
      nextMatch: null,
      revealedMatches: [],
    } satisfies RevealStatePayload);
  }

  const { data: revealRows } = await supabase
    .from("match_reveals")
    .select("id, match_result_id, reveal_order, revealed_at")
    .eq("event_id", eventId)
    .eq("viewer_user_id", auth.profile_id)
    .order("reveal_order", { ascending: true });

  if (!revealRows || revealRows.length === 0) {
    return Response.json({
      revealedCount: 0,
      totalCount: 0,
      nextMatch: null,
      revealedMatches: [],
    } satisfies RevealStatePayload);
  }

  const matchResultIds = [...new Set(revealRows.map((r) => r.match_result_id))];
  const { data: resultRows } = await supabase
    .from("match_results")
    .select("id, a_profile_id, b_profile_id, score")
    .in("id", matchResultIds);

  const resultMap = new Map(
    (resultRows || []).map((r: { id: string; a_profile_id: string; b_profile_id: string; score: number }) => [
      r.id,
      { a: r.a_profile_id, b: r.b_profile_id, score: Number(r.score) },
    ])
  );

  const { questions, answersByProfile } = await loadEventQuestionsAndAnswers(
    supabase,
    eventId
  );

  const currentAnswers = answersByProfile.get(auth.profile_id);
  const profileIds = new Set<string>();
  resultRows?.forEach((r: { a_profile_id: string; b_profile_id: string }) => {
    profileIds.add(r.a_profile_id);
    profileIds.add(r.b_profile_id);
  });
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", profileIds.size ? [...profileIds] : ["__none__"]);
  const profileNames = new Map(
    (profileRows || []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name || p.id])
  );

  function buildMatchPayload(
    resultId: string,
    otherId: string,
    score: number
  ): RevealMatchPayload {
    const otherAnswers = answersByProfile.get(otherId);
    const aligned = currentAnswers && otherAnswers && questions.length
      ? getExplanationsForPair(currentAnswers, otherAnswers, questions).aligned
      : [];
    const mismatched = currentAnswers && otherAnswers && questions.length
      ? getExplanationsForPair(currentAnswers, otherAnswers, questions).mismatched
      : [];
    return {
      matchResultId: resultId,
      conversationId: null,
      otherProfileId: otherId,
      displayName: profileNames.get(otherId) || otherId,
      score,
      aligned,
      mismatched,
    };
  }

  const revealed: RevealMatchPayload[] = [];
  let nextMatch: RevealMatchPayload | null = null;

  for (const r of revealRows) {
    const res = resultMap.get(r.match_result_id);
    if (!res) continue;
    const otherId = res.a === auth.profile_id ? res.b : res.a;
    const payload = buildMatchPayload(r.match_result_id, otherId, res.score);
    if (r.revealed_at) {
      revealed.push(payload);
    } else if (nextMatch === null) {
      nextMatch = payload;
    }
  }

  return Response.json({
    revealedCount: revealed.length,
    totalCount: revealRows.length,
    nextMatch,
    revealedMatches: revealed,
  } satisfies RevealStatePayload);
}
