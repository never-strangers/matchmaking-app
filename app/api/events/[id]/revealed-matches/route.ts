import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { getExplanationsForPair } from "@/lib/matching/questionnaireMatch";
import type { QuestionnaireAnswers, Question } from "@/types/questionnaire";
import type { RevealMatchPayload } from "@/app/api/events/[id]/matches/reveal-state/route";

export type RevealedMatchesResponse = {
  matches: RevealMatchPayload[];
  lastSeenOrder: number;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  // Ensure user is an attendee of this event
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

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  const since =
    sinceParam && !Number.isNaN(Number.parseInt(sinceParam, 10))
      ? Number.parseInt(sinceParam, 10)
      : null;

  // Load all revealed queue entries for this event
  const { data: queueRows } = await supabase
    .from("match_reveal_queue")
    .select("match_result_id, reveal_order, revealed_at")
    .eq("event_id", eventId)
    .not("revealed_at", "is", null)
    .order("reveal_order", { ascending: true });

  if (!queueRows || queueRows.length === 0) {
    return Response.json({
      matches: [],
      lastSeenOrder: since ?? 0,
    } satisfies RevealedMatchesResponse);
  }

  const matchResultIds = [
    ...new Set(queueRows.map((r) => String(r.match_result_id))),
  ];
  const { data: resultRows } = await supabase
    .from("match_results")
    .select("id, a_profile_id, b_profile_id, score")
    .in("id", matchResultIds);

  const resultMap = new Map<
    string,
    { a: string; b: string; score: number }
  >(
    (resultRows || []).map(
      (r: { id: string; a_profile_id: string; b_profile_id: string; score: number }) => [
        String(r.id),
        {
          a: String(r.a_profile_id),
          b: String(r.b_profile_id),
          score: Number(r.score),
        },
      ]
    )
  );

  const { data: convRows } = await supabase
    .from("conversations")
    .select("match_result_id, id")
    .in("match_result_id", matchResultIds);
  const conversationByMatchResult = new Map(
    (convRows || []).map((c: { match_result_id: string; id: string }) => [
      String(c.match_result_id),
      String(c.id),
    ])
  );

  // Questions + answers for explanations
  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, prompt, weight")
    .eq("event_id", eventId)
    .order("order_index", { ascending: true });
  const questions: Question[] = (questionRows || []).map(
    (q: { id: string; prompt: string; weight: number }) => ({
      id: String(q.id),
      text: q.prompt,
      category: "Custom" as Question["category"],
      weight: Number(q.weight ?? 1),
      isDealbreaker: false,
    })
  );

  const { data: answerRows } = await supabase
    .from("answers")
    .select("profile_id, question_id, answer")
    .eq("event_id", eventId);
  const answersByProfile = new Map<string, QuestionnaireAnswers>();
  (answerRows || []).forEach(
    (row: { profile_id: string; question_id: string; answer: unknown }) => {
      const pid = String(row.profile_id);
      const qid = String(row.question_id);
      const v = row.answer as { value?: number } | number | null;
      const n =
        typeof v === "number"
          ? v
          : typeof v?.value === "number"
          ? v.value
          : null;
      if (!(n === 1 || n === 2 || n === 3 || n === 4)) return;
      if (!answersByProfile.has(pid)) answersByProfile.set(pid, {});
      answersByProfile.get(pid)![qid] = n as 1 | 2 | 3 | 4;
    }
  );

  const currentAnswers = answersByProfile.get(auth.profile_id);

  const profileIds = new Set<string>();
  (resultRows || []).forEach(
    (r: { a_profile_id: string; b_profile_id: string }) => {
      profileIds.add(String(r.a_profile_id));
      profileIds.add(String(r.b_profile_id));
    }
  );
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", profileIds.size ? [...profileIds] : ["__none__"]);
  const profileNames = new Map(
    (profileRows || []).map(
      (p: { id: string; display_name: string | null }) => [
        String(p.id),
        p.display_name || p.id,
      ]
    )
  );

  type MatchWithOrder = RevealMatchPayload & { revealOrder: number };
  const matchesForUser: MatchWithOrder[] = [];

  for (const row of queueRows) {
    const res = resultMap.get(String(row.match_result_id));
    if (!res) continue;
    const isParticipant =
      res.a === auth.profile_id || res.b === auth.profile_id;
    if (!isParticipant) continue;
    const otherId = res.a === auth.profile_id ? res.b : res.a;
    const otherAnswers = answersByProfile.get(otherId);
    const explanations =
      currentAnswers && otherAnswers && questions.length
        ? getExplanationsForPair(currentAnswers, otherAnswers, questions)
        : { aligned: [] as string[], mismatched: [] as string[] };

    matchesForUser.push({
      matchResultId: String(row.match_result_id),
      conversationId: conversationByMatchResult.get(String(row.match_result_id)) ?? null,
      otherProfileId: otherId,
      displayName: profileNames.get(otherId) || otherId,
      score: res.score,
      aligned: explanations.aligned,
      mismatched: explanations.mismatched,
      revealOrder: Number(row.reveal_order),
    });
  }

  if (!matchesForUser.length) {
    return Response.json({
      matches: [],
      lastSeenOrder: since ?? 0,
    } satisfies RevealedMatchesResponse);
  }

  matchesForUser.sort((a, b) => a.revealOrder - b.revealOrder);

  const lastSeenOrder = matchesForUser.reduce(
    (max, m) => (m.revealOrder > max ? m.revealOrder : max),
    since ?? 0
  );

  const filtered =
    since === null
      ? matchesForUser
      : matchesForUser.filter((m) => m.revealOrder > since);

  return Response.json({
    matches: filtered.map(({ revealOrder, ...rest }) => rest),
    lastSeenOrder,
  } satisfies RevealedMatchesResponse);
}

