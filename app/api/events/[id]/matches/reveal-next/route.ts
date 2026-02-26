import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { getExplanationsForPair } from "@/lib/matching/questionnaireMatch";
import type { QuestionnaireAnswers, Question } from "@/types/questionnaire";
import type { RevealMatchPayload } from "../reveal-state/route";

export async function POST(
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
    return new Response(
      JSON.stringify({ error: "Matching not run for this event" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: nextReveal } = await supabase
    .from("match_reveals")
    .select("id, match_result_id, reveal_order")
    .eq("event_id", eventId)
    .eq("viewer_user_id", auth.profile_id)
    .is("revealed_at", null)
    .order("reveal_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextReveal) {
    return Response.json({ revealed: null, message: "No more matches to reveal" });
  }

  const { error: updateError } = await supabase
    .from("match_reveals")
    .update({ revealed_at: new Date().toISOString() })
    .eq("id", nextReveal.id)
    .eq("viewer_user_id", auth.profile_id);

  if (updateError) {
    console.error("Error marking reveal:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to reveal" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: resultRow } = await supabase
    .from("match_results")
    .select("id, a_profile_id, b_profile_id, score")
    .eq("id", nextReveal.match_result_id)
    .single();

  if (!resultRow) {
    return Response.json({ revealed: null });
  }

  const otherId =
    resultRow.a_profile_id === auth.profile_id
      ? resultRow.b_profile_id
      : resultRow.a_profile_id;
  const score = Number(resultRow.score);

  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, prompt, weight")
    .eq("event_id", eventId)
    .order("order_index", { ascending: true });
  const questions: Question[] = (questionRows || []).map((q: { id: string; prompt: string; weight: number }) => ({
    id: String(q.id),
    text: q.prompt,
    category: "Custom" as Question["category"],
    weight: Number(q.weight ?? 1),
    isDealbreaker: false,
  }));

  const { data: answerRows } = await supabase
    .from("answers")
    .select("profile_id, question_id, answer")
    .eq("event_id", eventId);
  const answersByProfile = new Map<string, QuestionnaireAnswers>();
  (answerRows || []).forEach((row: { profile_id: string; question_id: string; answer: unknown }) => {
    const pid = String(row.profile_id);
    const qid = String(row.question_id);
    const v = row.answer as { value?: number } | number | null;
    const n = typeof v === "number" ? v : typeof v?.value === "number" ? v.value : null;
    if (!(n === 1 || n === 2 || n === 3 || n === 4)) return;
    if (!answersByProfile.has(pid)) answersByProfile.set(pid, {});
    answersByProfile.get(pid)![qid] = n as 1 | 2 | 3 | 4;
  });

  const currentAnswers = answersByProfile.get(auth.profile_id);
  const otherAnswers = answersByProfile.get(otherId);
  const { aligned, mismatched } =
    currentAnswers && otherAnswers && questions.length
      ? getExplanationsForPair(currentAnswers, otherAnswers, questions)
      : { aligned: [] as string[], mismatched: [] as string[] };

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", otherId)
    .maybeSingle();

  const payload: RevealMatchPayload = {
    matchResultId: resultRow.id,
    otherProfileId: otherId,
    displayName: (profileRow?.display_name as string) || otherId,
    score,
    aligned,
    mismatched,
  };

  return Response.json({ revealed: payload });
}
