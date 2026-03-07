import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import type { QuestionnaireAnswers, MatchUser, Question } from "@/types/questionnaire";
import { computeSingleRound, pairKey } from "@/lib/matching/roundPairing";

const MAX_ROUNDS = 3;

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
    .select("id, payment_required, category")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError || !event) {
    return new Response("Event not found", { status: 404 });
  }
  const paymentRequired = (event as { payment_required?: boolean }).payment_required !== false;
  const isDatingEvent = (event as { category?: string }).category === "dating";

  // Load match_rounds to determine next round to compute (do not reset reveal state)
  const { data: roundsRow, error: roundsError } = await supabase
    .from("match_rounds")
    .select("last_revealed_round, last_computed_round")
    .eq("event_id", eventId)
    .maybeSingle();

  if (roundsError) {
    console.error("Error loading match_rounds:", roundsError);
    return new Response("Failed to load match state", { status: 500 });
  }

  let lastComputedRound = roundsRow?.last_computed_round ?? 0;
  const lastRevealedRound = roundsRow?.last_revealed_round ?? 0;

  // Sync: if reveal got ahead of compute (e.g. legacy data), set compute to revealed
  if (lastRevealedRound > lastComputedRound) {
    lastComputedRound = lastRevealedRound;
    const { data: exists } = await supabase
      .from("match_rounds")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (exists) {
      await supabase
        .from("match_rounds")
        .update({
          last_computed_round: lastComputedRound,
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", eventId);
    } else {
      await supabase.from("match_rounds").insert({
        event_id: eventId,
        last_computed_round: lastComputedRound,
        updated_at: new Date().toISOString(),
      });
    }
  }

  const roundToCompute = lastComputedRound + 1;
  if (roundToCompute > MAX_ROUNDS) {
    return Response.json({
      ok: true,
      allRoundsComputed: true,
      message: "All rounds computed.",
      lastComputedRound: MAX_ROUNDS,
    });
  }

  // Idempotency: if this round already has results, just ensure last_computed_round is set and return
  const { data: existingForRound, error: existingErr } = await supabase
    .from("match_results")
    .select("id")
    .eq("event_id", eventId)
    .eq("round", roundToCompute)
    .limit(1);
  if (existingErr) {
    console.error("Error checking existing results:", existingErr);
    return new Response("Failed to check match state", { status: 500 });
  }
  if (existingForRound && existingForRound.length > 0) {
    await upsertMatchRoundsComputed(supabase, eventId, roundToCompute);
    const { count } = await supabase
      .from("match_results")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("round", roundToCompute);
    return Response.json({
      ok: true,
      roundComputed: roundToCompute,
      alreadyHadResults: true,
      pairsCount: count ?? 0,
      message: "Round already computed.",
    });
  }

  // Eligible: checked_in, payment ok, questionnaire complete
  let query = supabase
    .from("event_attendees")
    .select("profile_id")
    .eq("event_id", eventId)
    .eq("checked_in", true);
  if (paymentRequired) {
    query = query.eq("payment_status", "paid");
  } else {
    query = query.in("payment_status", ["free", "not_required", "paid"]);
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
    return Response.json({
      ok: true,
      roundComputed: roundToCompute,
      pairsCount: 0,
      message: "Not enough checked-in attendees for matching (need at least 2).",
    });
  }

  // For dating events: load gender for each attendee profile
  const genderById = new Map<string, string>();
  if (isDatingEvent) {
    const { data: profileRows, error: profilesErr } = await supabase
      .from("profiles")
      .select("id, gender")
      .in("id", attendeeIds);
    if (profilesErr) {
      console.error("Error loading profile genders:", profilesErr);
      return new Response("Failed to load attendee profiles", { status: 500 });
    }
    (profileRows || []).forEach((p: { id: string; gender: string | null }) => {
      if (p.gender) genderById.set(String(p.id), p.gender.toLowerCase());
    });
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

  const questions: Question[] = (dbQuestions || []).map((q: { id: string; prompt: string; weight?: number }) => ({
    id: String(q.id),
    text: q.prompt,
    category: "Custom" as Question["category"],
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
  (dbAnswers || []).forEach((row: { profile_id: string; question_id: string; answer: unknown }) => {
    const pid = String(row.profile_id);
    if (!attendeeIds.includes(pid)) return;
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
  });

  const profilesWithAnswers = attendeeIds.filter((id) => answersByProfile.has(id));
  if (profilesWithAnswers.length < 2) {
    return Response.json({
      ok: true,
      roundComputed: roundToCompute,
      pairsCount: 0,
      message: "Not enough answered attendees for this round.",
    });
  }

  // Existing match_results for this event (all rounds): pair keys + users already in this round
  const { data: existingResults, error: existingResultsError } = await supabase
    .from("match_results")
    .select("a_profile_id, b_profile_id, round")
    .eq("event_id", eventId);

  if (existingResultsError) {
    console.error("Error loading existing match_results:", existingResultsError);
    return new Response("Failed to load existing matches", { status: 500 });
  }

  const existingPairKeys = new Set<string>();
  const userIdsWithMatchInThisRound = new Set<string>();
  (existingResults || []).forEach(
    (r: { a_profile_id: string; b_profile_id: string; round: number }) => {
      const a = String(r.a_profile_id);
      const b = String(r.b_profile_id);
      existingPairKeys.add(pairKey(a, b));
      if (Number(r.round) === roundToCompute) {
        userIdsWithMatchInThisRound.add(a);
        userIdsWithMatchInThisRound.add(b);
      }
    }
  );

  // Eligible for this round: answered + not already paired in this round
  const eligibleForRound = profilesWithAnswers.filter((id) => !userIdsWithMatchInThisRound.has(id));
  if (eligibleForRound.length < 2) {
    await upsertMatchRoundsComputed(supabase, eventId, roundToCompute);
    return Response.json({
      ok: true,
      roundComputed: roundToCompute,
      pairsCount: 0,
      message: "No additional pairs for this round (everyone already matched or too few eligible).",
    });
  }

  const matchUsers: MatchUser[] = eligibleForRound.map((id) => ({
    id,
    name: id,
    city: "",
    gender: genderById.get(id),
    answers: answersByProfile.get(id)!,
  }));

  const pairs = computeSingleRound(
    matchUsers,
    questions,
    existingPairKeys,
    { pairingMode: isDatingEvent ? "dating" : "friends" }
  );

  const resultsToInsert: Array<{
    event_id: string;
    a_profile_id: string;
    b_profile_id: string;
    score: number;
    round: number;
  }> = [];
  for (const p of pairs) {
    const [a, b] = [p.a, p.b].sort();
    resultsToInsert.push({
      event_id: eventId,
      a_profile_id: a,
      b_profile_id: b,
      score: p.score,
      round: roundToCompute,
    });
  }

  if (resultsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("match_results")
      .insert(resultsToInsert);

    if (insertError) {
      console.error("Error inserting match_results:", insertError);
      return new Response("Failed to save matches", { status: 500 });
    }
  }

  await upsertMatchRoundsComputed(supabase, eventId, roundToCompute);

  const now = new Date().toISOString();
  await supabase.from("match_runs").insert({
    event_id: eventId,
    status: "done",
    created_at: now,
    finished_at: now,
  });

  return Response.json({
    ok: true,
    roundComputed: roundToCompute,
    pairsCount: pairs.length,
    attendeesInRound: eligibleForRound.length,
    pairingMode: isDatingEvent ? "dating" : "friends",
  });
}

async function upsertMatchRoundsComputed(
  supabase: ReturnType<typeof getServiceSupabaseClient>,
  eventId: string,
  round: number
) {
  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    last_computed_round: round,
    updated_at: now,
  };
  if (round === 1) updatePayload.round1_computed_at = now;
  if (round === 2) updatePayload.round2_computed_at = now;
  if (round === 3) updatePayload.round3_computed_at = now;

  const { data: existing } = await supabase
    .from("match_rounds")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    await supabase.from("match_rounds").update(updatePayload).eq("event_id", eventId);
  } else {
    await supabase.from("match_rounds").insert({
      event_id: eventId,
      ...updatePayload,
    });
  }
}
