import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

type Body = {
  question_id?: string;
  value?: number;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;
  const { profile_id } = auth;

  const { id: eventId } = await context.params;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const questionId = body.question_id;
  const value = body.value;

  if (!questionId || !(value === 1 || value === 2 || value === 3 || value === 4)) {
    return new Response("Invalid payload", { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  // If question_id matches an event_questions row, also populate event_question_id
  // so that any code relying on that column works for real users too.
  // Legacy events have no event_questions rows → eventQuestionId stays null (correct).
  const { data: eqRow } = await supabase
    .from("event_questions")
    .select("id")
    .eq("event_id", eventId)
    .eq("id", questionId)
    .maybeSingle();

  const eventQuestionId: string | null = eqRow?.id ?? null;

  const { error } = await supabase
    .from("answers")
    .upsert(
      {
        event_id: eventId,
        question_id: questionId,
        event_question_id: eventQuestionId,
        profile_id,
        answer: { value },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,question_id,profile_id" }
    );

  if (error) {
    console.error("Error upserting answer:", error);
    return new Response("Failed to save answer", { status: 500 });
  }

  return Response.json({ ok: true });
}
