import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import type { QuestionnaireAnswers, MatchUser, Question } from "@/types/questionnaire";
import { computeRoundPairings } from "@/lib/matching/roundPairing";

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

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, payment_required")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError || !event) {
    return new Response("Event not found", { status: 404 });
  }
  const paymentRequired = (event as { payment_required?: boolean }).payment_required !== false;

  let query = supabase
    .from("event_attendees")
    .select("profile_id")
    .eq("event_id", eventId)
    .eq("checked_in", true);
  if (paymentRequired) {
    query = query.eq("payment_status", "paid");
  }
  const { data: attendees, error: attendeesError } = await query;

  if (attendeesError) {
    console.error("Error loading attendees:", attendeesError);
    return new Response("Failed to load attendees", { status: 500 });
  }

  const attendeeIds = Array.from(
    new Set((attendees || []).map((a: { profile_id: string }) => String(a.profile_id)))
  );

  if (attendeeIds.length < 2) {
    return new Response("Not enough checked-in attendees for matching (need at least 2)", { status: 400 });
  }
  if (attendeeIds.length < 4) {
    console.warn(`Run matching: only ${attendeeIds.length} checked-in attendees for event ${eventId}`);
  }

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

  const matchUsers: MatchUser[] = profilesWithAnswers.map((id) => ({
    id,
    name: id,
    city: "",
    answers: answersByProfile.get(id)!,
  }));

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

  const { round1, round2, round3 } = computeRoundPairings(matchUsers, questions);

  const resultsToInsert: Array<{
    event_id: string;
    a_profile_id: string;
    b_profile_id: string;
    score: number;
    round: number;
  }> = [];

  for (const p of round1) {
    resultsToInsert.push({
      event_id: eventId,
      a_profile_id: p.a,
      b_profile_id: p.b,
      score: p.score,
      round: 1,
    });
  }
  for (const p of round2) {
    resultsToInsert.push({
      event_id: eventId,
      a_profile_id: p.a,
      b_profile_id: p.b,
      score: p.score,
      round: 2,
    });
  }
  for (const p of round3) {
    resultsToInsert.push({
      event_id: eventId,
      a_profile_id: p.a,
      b_profile_id: p.b,
      score: p.score,
      round: 3,
    });
  }

  await supabase.from("match_results").delete().eq("event_id", eventId);
  if (resultsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("match_results")
      .insert(resultsToInsert);

    if (insertError) {
      console.error("Error inserting match_results:", insertError);
      await supabase
        .from("match_runs")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("id", runRow.id);
      return new Response("Failed to save matches", { status: 500 });
    }
  }

  await supabase.from("match_reveal_queue").delete().eq("event_id", eventId);

  await supabase
    .from("match_rounds")
    .upsert(
      {
        event_id: eventId,
        round1_revealed_at: null,
        round2_revealed_at: null,
        round3_revealed_at: null,
        last_revealed_round: 0,
        updated_at: now,
      },
      { onConflict: "event_id" }
    );

  await supabase
    .from("match_runs")
    .update({ status: "done", finished_at: new Date().toISOString() })
    .eq("id", runRow.id);

  return Response.json({
    ok: true,
    run_id: runRow.id,
    round1Pairs: round1.length,
    round2Pairs: round2.length,
    round3Pairs: round3.length,
    attendees: profilesWithAnswers.length,
  });
}
