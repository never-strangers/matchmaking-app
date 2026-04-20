import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question, QuestionnaireAnswers } from "@/types/questionnaire";
import { fetchAllRows } from "@/lib/supabase/fetchAll";

/**
 * Load questions for an event, preferring event_questions (new) over questions (legacy).
 * Also loads answers keyed by the matching question ID.
 */
export async function loadEventQuestionsAndAnswers(
  supabase: SupabaseClient,
  eventId: string
): Promise<{
  questions: Question[];
  answersByProfile: Map<string, QuestionnaireAnswers>;
}> {
  const { data: eqRows } = await supabase
    .from("event_questions")
    .select("id, prompt, weight, sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  let questions: Question[];
  let useEventQuestions = false;

  if (eqRows && eqRows.length > 0) {
    useEventQuestions = true;
    questions = eqRows.map(
      (q: { id: string; prompt: string; weight: number }) => ({
        id: String(q.id),
        text: q.prompt,
        category: "Custom" as Question["category"],
        weight: Number(q.weight ?? 1),
        isDealbreaker: false,
      })
    );
  } else {
    const { data: legacyRows } = await supabase
      .from("questions")
      .select("id, prompt, weight")
      .eq("event_id", eventId)
      .order("order_index", { ascending: true });

    questions = (legacyRows || []).map(
      (q: { id: string; prompt: string; weight: number }) => ({
        id: String(q.id),
        text: q.prompt,
        category: "Custom" as Question["category"],
        weight: Number(q.weight ?? 1),
        isDealbreaker: false,
      })
    );
  }

  const answerRows = await fetchAllRows<{
    profile_id: string;
    question_id: string;
    event_question_id: string | null;
    answer: unknown;
  }>(
    (offset, limit) =>
      supabase
        .from("answers")
        .select("profile_id, question_id, event_question_id, answer")
        .eq("event_id", eventId)
        .range(offset, offset + limit - 1)
  );

  const answersByProfile = new Map<string, QuestionnaireAnswers>();
  answerRows.forEach(
    (row) => {
      const pid = String(row.profile_id);
      const qid = useEventQuestions
        ? String(row.event_question_id ?? row.question_id)
        : String(row.question_id);
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

  return { questions, answersByProfile };
}
