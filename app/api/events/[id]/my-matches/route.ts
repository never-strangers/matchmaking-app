import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { getExplanationsForPair } from "@/lib/matching/questionnaireMatch";
import { loadEventQuestionsAndAnswers } from "@/lib/matching/loadEventQuestions";
import type { RevealMatchPayload } from "@/app/api/events/[id]/matches/reveal-state/route";

export type MyMatchesResponse = {
  rounds: {
    1?: RevealMatchPayload;
    2?: RevealMatchPayload;
    3?: RevealMatchPayload;
  };
  lastRevealedRound: number;
  nextRoundToWaitFor: number | null;
  currentUserInstagram: string | null;
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

  const { data: roundsRow, error: roundsError } = await supabase
    .from("match_rounds")
    .select("last_revealed_round")
    .eq("event_id", eventId)
    .maybeSingle();

  if (roundsError) {
    console.error("Error fetching match_rounds:", roundsError);
    return new Response("Failed to load match state", { status: 500 });
  }

  const lastRevealedRound = roundsRow?.last_revealed_round ?? 0;
  const nextRoundToWaitFor =
    lastRevealedRound < 3 ? lastRevealedRound + 1 : null;

  if (lastRevealedRound < 1) {
    return Response.json({
      rounds: {},
      lastRevealedRound: 0,
      nextRoundToWaitFor: 1,
      currentUserInstagram: null,
    } satisfies MyMatchesResponse);
  }

  const { data: resultRows } = await supabase
    .from("match_results")
    .select("id, a_profile_id, b_profile_id, score, round")
    .eq("event_id", eventId)
    .lte("round", lastRevealedRound)
    .order("round", { ascending: true });

  const matchResultIds = (resultRows || []).map((r: { id: string }) => r.id);
  const { data: convRows } =
    matchResultIds.length > 0
      ? await supabase
          .from("conversations")
          .select("match_result_id, id")
          .in("match_result_id", matchResultIds)
      : { data: [] };
  const conversationByMatchResult = new Map(
    (convRows || []).map((c: { match_result_id: string; id: string }) => [
      String(c.match_result_id),
      String(c.id),
    ])
  );

  const myResults = (resultRows || []).filter(
    (r: { a_profile_id: string; b_profile_id: string }) =>
      r.a_profile_id === auth.profile_id || r.b_profile_id === auth.profile_id
  );

  if (myResults.length === 0) {
    return Response.json({
      rounds: {},
      lastRevealedRound,
      nextRoundToWaitFor,
      currentUserInstagram: null,
    } satisfies MyMatchesResponse);
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("instagram")
    .eq("id", auth.profile_id)
    .maybeSingle();
  const currentUserInstagram =
    (myProfile as { instagram?: string | null } | null)?.instagram?.trim() || null;

  const conversationIds = myResults
    .map((r) => conversationByMatchResult.get(String(r.id)))
    .filter(Boolean) as string[];
  const { data: sharedRows } =
    conversationIds.length > 0
      ? await supabase
          .from("messages")
          .select("conversation_id")
          .eq("sender_id", auth.profile_id)
          .eq("kind", "contact_share")
          .in("conversation_id", conversationIds)
      : { data: [] };
  const conversationIdsWhereISharedInstagram = new Set(
    (sharedRows || []).map((r: { conversation_id: string }) => r.conversation_id)
  );

  const { questions, answersByProfile } = await loadEventQuestionsAndAnswers(
    supabase,
    eventId
  );

  const currentAnswers = answersByProfile.get(auth.profile_id);
  const profileIds = new Set<string>();
  myResults.forEach((r: { a_profile_id: string; b_profile_id: string }) => {
    profileIds.add(String(r.a_profile_id));
    profileIds.add(String(r.b_profile_id));
  });
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

  const rounds: MyMatchesResponse["rounds"] = {};

  for (const r of myResults) {
    const otherId =
      r.a_profile_id === auth.profile_id ? r.b_profile_id : r.a_profile_id;
    const otherAnswers = answersByProfile.get(otherId);
    const explanations =
      currentAnswers && otherAnswers && questions.length
        ? getExplanationsForPair(currentAnswers, otherAnswers, questions)
        : { aligned: [] as string[], mismatched: [] as string[] };

    const roundNum = Number(r.round) as 1 | 2 | 3;
    const cid = conversationByMatchResult.get(String(r.id)) ?? null;
    rounds[roundNum] = {
      matchResultId: String(r.id),
      conversationId: cid,
      otherProfileId: otherId,
      displayName: profileNames.get(otherId) || otherId,
      score: Number(r.score),
      aligned: explanations.aligned,
      mismatched: explanations.mismatched,
      instagramSharedByMe: cid ? conversationIdsWhereISharedInstagram.has(cid) : false,
    };
  }

  return Response.json({
    rounds,
    lastRevealedRound,
    nextRoundToWaitFor,
    currentUserInstagram,
  } satisfies MyMatchesResponse);
}
