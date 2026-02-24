import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { getMatchesForUser } from "@/lib/matching/questionnaireMatch";
import type { QuestionnaireAnswers, MatchUser, Question } from "@/types/questionnaire";

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

  // Load attendees for this event
  const { data: attendees, error: attendeesError } = await supabase
    .from("event_attendees")
    .select("profile_id")
    .eq("event_id", eventId);

  if (attendeesError) {
    console.error("Error loading attendees:", attendeesError);
    return new Response("Failed to load attendees", { status: 500 });
  }

  const attendeeIds = Array.from(
    new Set((attendees || []).map((a: any) => String(a.profile_id)))
  );

  if (attendeeIds.length < 2) {
    return new Response("Not enough attendees for matching", { status: 400 });
  }

  // Load questions for this event
  const { data: dbQuestions, error: questionsError } = await supabase
    .from("questions")
    .select("id, prompt, weight")
    .eq("event_id", eventId)
    .order("order_index", { ascending: true });

  if (questionsError) {
    console.error("Error loading questions:", questionsError);
    return new Response("Failed to load questions", { status: 500 });
  }

  const questions: Question[] = (dbQuestions || []).map((q: any) => ({
    id: String(q.id),
    text: q.prompt,
    category: "Custom" as any,
    weight: Number(q.weight ?? 1),
    isDealbreaker: false,
  }));

  if (questions.length === 0) {
    return new Response("No questions configured for this event", { status: 400 });
  }

  // Load all answers for this event
  const { data: dbAnswers, error: answersError } = await supabase
    .from("answers")
    .select("profile_id, question_id, answer")
    .eq("event_id", eventId);

  if (answersError) {
    console.error("Error loading answers:", answersError);
    return new Response("Failed to load answers", { status: 500 });
  }

  const answersByProfile = new Map<string, QuestionnaireAnswers>();

  (dbAnswers || []).forEach((row: any) => {
    const pid = String(row.profile_id);
    if (!attendeeIds.includes(pid)) return;
    const qid = String(row.question_id);
    const v = row.answer as any;
    const n =
      typeof v === "number"
        ? v
        : typeof v?.value === "number"
        ? v.value
        : null;
    if (!(n === 1 || n === 2 || n === 3 || n === 4)) return;

    if (!answersByProfile.has(pid)) {
      answersByProfile.set(pid, {});
    }
    const qa = answersByProfile.get(pid)!;
    qa[qid] = n;
  });

  const profilesWithAnswers = attendeeIds.filter((id) =>
    answersByProfile.has(id)
  );
  if (profilesWithAnswers.length < 2) {
    return new Response("Not enough answered attendees for matching", {
      status: 400,
    });
  }

  // Build MatchUser objects (minimal: id + answers)
  const matchUsers: MatchUser[] = profilesWithAnswers.map((id) => ({
    id,
    name: id,
    city: "",
    answers: answersByProfile.get(id)!,
  }));

  // Create a new match_run record
  const now = new Date().toISOString();
  const { data: runRow, error: runError } = await supabase
    .from("match_runs")
    .insert({
      event_id: eventId,
      status: "running",
      created_at: now,
    })
    .select()
    .single();

  if (runError || !runRow) {
    console.error("Error creating match_run:", runError);
    return new Response("Failed to start matching", { status: 500 });
  }

  // Compute pairwise matches
  const createdPairs = new Set<string>();
  const resultsToUpsert: Array<{
    event_id: string;
    a_profile_id: string;
    b_profile_id: string;
    score: number;
  }> = [];

  for (const user of matchUsers) {
    const candidates = matchUsers.filter((u) => u.id !== user.id);
    const matches = getMatchesForUser(user, candidates, questions);

    for (const match of matches) {
      const other = match.user;
      const [a, b] = [user.id, other.id].sort();
      const key = `${a}_${b}`;
      if (createdPairs.has(key)) continue;
      createdPairs.add(key);

      resultsToUpsert.push({
        event_id: eventId,
        a_profile_id: a,
        b_profile_id: b,
        score: match.score,
      });
    }
  }

  if (resultsToUpsert.length > 0) {
    const { error: upsertError } = await supabase
      .from("match_results")
      .upsert(resultsToUpsert, {
        onConflict: "event_id,a_profile_id,b_profile_id",
      });

    if (upsertError) {
      console.error("Error upserting match_results:", upsertError);
      await supabase
        .from("match_runs")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("id", runRow.id);
      return new Response("Failed to save matches", { status: 500 });
    }
  }

  // Mark run as completed
  await supabase
    .from("match_runs")
    .update({ status: "done", finished_at: new Date().toISOString() })
    .eq("id", runRow.id);

  return Response.json({
    ok: true,
    run_id: runRow.id,
    pairs: resultsToUpsert.length,
    attendees: profilesWithAnswers.length,
  });
}

