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

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, payment_required")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError || !event) {
    return new Response("Event not found", { status: 404 });
  }
  const paymentRequired = (event as { payment_required?: boolean }).payment_required !== false;

  // Load attendees: checked_in = true, and if payment_required then payment_status = 'paid'
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

  let upsertedRows: Array<{ id: string; a_profile_id: string; b_profile_id: string; score: number }> = [];
  if (resultsToUpsert.length > 0) {
    const { data: upserted, error: upsertError } = await supabase
      .from("match_results")
      .upsert(resultsToUpsert, {
        onConflict: "event_id,a_profile_id,b_profile_id",
      })
      .select("id, a_profile_id, b_profile_id, score");

    if (upsertError) {
      console.error("Error upserting match_results:", upsertError);
      await supabase
        .from("match_runs")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("id", runRow.id);
      return new Response("Failed to save matches", { status: 500 });
    }
    upsertedRows = upserted || [];
  }

  // Reset reveal progress and populate match_reveals for one-by-one reveal
  await supabase.from("match_reveals").delete().eq("event_id", eventId);

  if (upsertedRows.length > 0) {
    const byViewer = new Map<string, Array<{ match_result_id: string; score: number }>>();
    for (const row of upsertedRows) {
      const a = String(row.a_profile_id);
      const b = String(row.b_profile_id);
      const id = String(row.id);
      const score = Number(row.score);
      if (!byViewer.has(a)) byViewer.set(a, []);
      byViewer.get(a)!.push({ match_result_id: id, score });
      if (a !== b) {
        if (!byViewer.has(b)) byViewer.set(b, []);
        byViewer.get(b)!.push({ match_result_id: id, score });
      }
    }
    const revealInserts: Array<{
      event_id: string;
      viewer_user_id: string;
      match_result_id: string;
      reveal_order: number;
      revealed_at: null;
    }> = [];
    for (const [viewerId, list] of byViewer.entries()) {
      list.sort((x, y) => y.score - x.score);
      list.forEach((item, idx) => {
        revealInserts.push({
          event_id: eventId,
          viewer_user_id: viewerId,
          match_result_id: item.match_result_id,
          reveal_order: idx + 1,
          revealed_at: null,
        });
      });
    }
    if (revealInserts.length > 0) {
      const { error: revealErr } = await supabase.from("match_reveals").insert(revealInserts);
      if (revealErr) {
        console.error("Error inserting match_reveals:", revealErr);
      }
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

