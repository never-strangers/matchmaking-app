import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import type { QuestionnaireAnswers, MatchUser, Question } from "@/types/questionnaire";
import {
  computeSingleRound,
  computeSingleRoundWithFallback,
  pairKey,
} from "@/lib/matching/roundPairing";

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

  // Phase 1: Load event (needed to branch on payment_required / category)
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, payment_required, price_cents, category")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError || !event) {
    return new Response("Event not found", { status: 404 });
  }
  const priceCents = Number((event as { price_cents?: number }).price_cents ?? 0);
  // paymentRequired is true only when explicitly required AND price > 0
  const paymentRequired =
    (event as { payment_required?: boolean }).payment_required !== false &&
    priceCents > 0;
  const isDatingEvent = (event as { category?: string }).category === "dating";

  // Phase 2: Load everything else in parallel
  let attendeesQuery = supabase
    .from("event_attendees")
    .select("profile_id")
    .eq("event_id", eventId)
    .eq("checked_in", true);
  if (paymentRequired) {
    // Paid events: only fully paid attendees are eligible
    attendeesQuery = attendeesQuery.eq("payment_status", "paid");
  }
  // Free events: all checked-in attendees are eligible regardless of payment_status
  // (avoids excluding users whose payment_status wasn't explicitly set to "free")

  const [roundsRes, attendeesRes, eqRes, allAnswerRows, existingResultsRes] = await Promise.all([
    supabase
      .from("match_rounds")
      .select("last_revealed_round, last_computed_round")
      .eq("event_id", eventId)
      .maybeSingle(),
    attendeesQuery,
    supabase
      .from("event_questions")
      .select("id, prompt, weight")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    fetchAllRows<{ profile_id: string; question_id: string; event_question_id: string | null; answer: unknown }>(
      (offset, limit) =>
        supabase
          .from("answers")
          .select("profile_id, question_id, event_question_id, answer")
          .eq("event_id", eventId)
          .range(offset, offset + limit - 1)
    ),
    supabase
      .from("match_results")
      .select("a_profile_id, b_profile_id, round")
      .eq("event_id", eventId),
  ]);

  if (roundsRes.error) {
    console.error("Error loading match_rounds:", roundsRes.error);
    return new Response("Failed to load match state", { status: 500 });
  }
  if (attendeesRes.error) {
    console.error("Error loading attendees:", attendeesRes.error);
    return new Response("Failed to load attendees", { status: 500 });
  }
  if (existingResultsRes.error) {
    console.error("Error loading existing match_results:", existingResultsRes.error);
    return new Response("Failed to load existing matches", { status: 500 });
  }

  // Determine round to compute
  const roundsRow = roundsRes.data;
  let lastComputedRound = roundsRow?.last_computed_round ?? 0;
  const lastRevealedRound = roundsRow?.last_revealed_round ?? 0;

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

  // Check idempotency from existing results (already loaded in parallel)
  const existingForRound = (existingResultsRes.data || []).filter(
    (r: { round: number }) => Number(r.round) === roundToCompute
  );
  if (existingForRound.length > 0) {
    await upsertMatchRoundsComputed(supabase, eventId, roundToCompute);
    return Response.json({
      ok: true,
      roundComputed: roundToCompute,
      alreadyHadResults: true,
      pairsCount: existingForRound.length,
      message: "Round already computed.",
    });
  }

  // Process attendees
  const attendeeIds = Array.from(
    new Set((attendeesRes.data || []).map((a: { profile_id: string }) => String(a.profile_id)))
  );

  if (attendeeIds.length < 2) {
    return Response.json({
      ok: true,
      roundComputed: roundToCompute,
      pairsCount: 0,
      message: "Not enough checked-in attendees for matching (need at least 2).",
    });
  }

  // For dating events: load gender (separate query only when needed)
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

  // Build questions array
  let questions: Question[] = [];
  if (eqRes.data && eqRes.data.length > 0) {
    questions = eqRes.data.map((q: { id: string; prompt: string; weight?: number }) => ({
      id: String(q.id),
      text: q.prompt,
      category: "Custom" as Question["category"],
      weight: Number(q.weight ?? 1),
      isDealbreaker: false,
    }));
  } else {
    // Legacy fallback
    const { data: dbQuestions, error: questionsError } = await supabase
      .from("questions")
      .select("id, prompt, weight")
      .eq("event_id", eventId)
      .order("order_index", { ascending: true });

    if (questionsError) {
      console.error("Error loading questions:", questionsError);
      return new Response("Failed to load questions", { status: 500 });
    }
    questions = (dbQuestions || []).map((q: { id: string; prompt: string; weight?: number }) => ({
      id: String(q.id),
      text: q.prompt,
      category: "Custom" as Question["category"],
      weight: Number(q.weight ?? 1),
      isDealbreaker: false,
    }));
  }

  if (questions.length < 1) {
    return new Response(
      `Event needs at least 1 question before matching can run (found ${questions.length}).`,
      { status: 400 }
    );
  }

  // Build answers map
  const answersByProfile = new Map<string, QuestionnaireAnswers>();
  allAnswerRows.forEach((row) => {
    const pid = String(row.profile_id);
    if (!attendeeIds.includes(pid)) return;
    const qid = String(row.event_question_id ?? row.question_id);
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

  // Build exclude set from existing results (already loaded)
  const existingPairKeys = new Set<string>();
  const userIdsWithMatchInThisRound = new Set<string>();
  (existingResultsRes.data || []).forEach(
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

  // ── Run pairing ────────────────────────────────────────────────────────────
  // Dating events: two-pass (date first, friend fallback for unmatched)
  // Friends events: unchanged single-pass friends pairing
  let pairs: ReturnType<typeof computeSingleRound>;
  let matchTypeMap: Record<string, "date" | "friend"> = {};

  if (isDatingEvent) {
    const result = computeSingleRoundWithFallback(
      matchUsers,
      questions,
      existingPairKeys
    );
    pairs = result.pairs;
    matchTypeMap = result.matchTypes;
  } else {
    pairs = computeSingleRound(matchUsers, questions, existingPairKeys, {
      pairingMode: "friends",
    });
  }

  // ── Build summary (dating events only) ────────────────────────────────────
  const eligibleMales = isDatingEvent
    ? eligibleForRound.filter((id) => genderById.get(id) === "male").length
    : 0;
  const eligibleFemales = isDatingEvent
    ? eligibleForRound.filter((id) => genderById.get(id) === "female").length
    : 0;
  const dateMatchCount = isDatingEvent
    ? Object.values(matchTypeMap).filter((t) => t === "date").length
    : 0;
  const friendMatchCount = isDatingEvent
    ? Object.values(matchTypeMap).filter((t) => t === "friend").length
    : 0;
  // Users involved in any pair this round
  const matchedUserIds = new Set<string>();
  for (const p of pairs) {
    matchedUserIds.add(p.a);
    matchedUserIds.add(p.b);
  }
  const unmatchedCount = eligibleForRound.filter((id) => !matchedUserIds.has(id)).length;

  // Phase 3: Write results in parallel
  const resultsToInsert: Array<{
    event_id: string;
    a_profile_id: string;
    b_profile_id: string;
    score: number;
    round: number;
    match_type: string;
  }> = [];
  for (const p of pairs) {
    const [a, b] = [p.a, p.b].sort();
    const key = pairKey(a, b);
    resultsToInsert.push({
      event_id: eventId,
      a_profile_id: a,
      b_profile_id: b,
      score: p.score,
      round: roundToCompute,
      match_type: matchTypeMap[key] ?? "date",
    });
  }

  const now = new Date().toISOString();

  const writeOps: PromiseLike<unknown>[] = [
    upsertMatchRoundsComputed(supabase, eventId, roundToCompute),
    supabase.from("match_runs").insert({
      event_id: eventId,
      status: "done",
      created_at: now,
      finished_at: now,
    }).then(() => {}),
  ];

  if (resultsToInsert.length > 0) {
    writeOps.push(
      supabase
        .from("match_results")
        .insert(resultsToInsert)
        .then(({ error }) => {
          if (error) {
            console.error("Error inserting match_results:", error);
            throw new Error("Failed to save matches");
          }
        })
    );
  }

  await Promise.all(writeOps);

  const response: Record<string, unknown> = {
    ok: true,
    round: roundToCompute,
    pairs: pairs.length,
    attendeesInRound: eligibleForRound.length,
    pairingMode: isDatingEvent ? "dating" : "friends",
  };

  if (isDatingEvent) {
    response.summary = {
      eligible_males: eligibleMales,
      eligible_females: eligibleFemales,
      date_matches: dateMatchCount,
      friend_matches: friendMatchCount,
      unmatched: unmatchedCount,
    };
  }

  return Response.json(response);
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
