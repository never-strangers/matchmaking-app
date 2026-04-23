import type { MatchUser, Question, AnswerValue } from "@/types/questionnaire";
import { getMatchesForUser } from "./questionnaireMatch";

export type PairWithScore = {
  a: string;
  b: string;
  score: number;
};

export type PairingOptions = {
  /**
   * Controls how pairs are filtered by gender:
   *   'dating'  — only male↔female pairs (both genders must be known)
   *   'friends' — no gender filter; any pair is allowed (default)
   */
  pairingMode?: "friends" | "dating";
};

function scoreOnly(
  answersA: Record<string, AnswerValue>,
  answersB: Record<string, AnswerValue>,
  questions: Question[]
): number | null {
  let totalWeightedSim = 0;
  let totalWeight = 0;
  for (const q of questions) {
    const a = answersA[q.id];
    const b = answersB[q.id];
    if (!a || !b) continue;
    const diff = Math.abs(a - b);
    if (q.isDealbreaker && diff >= 2) return null;
    totalWeightedSim += (q.weight || 1) * (1 - diff / 3);
    totalWeight += q.weight || 1;
  }
  return totalWeight === 0 ? 0 : Math.round((totalWeightedSim / totalWeight) * 100);
}

function parseAttractedTo(val: string | undefined): Set<string> {
  if (!val) return new Set();
  if (val === "both") return new Set(["men", "women"]);
  return new Set(val.split(",").map((s) => s.trim().toLowerCase()));
}

function canDatePair(u1: MatchUser, u2: MatchUser): boolean {
  const g1 = u1.gender?.toLowerCase();
  const g2 = u2.gender?.toLowerCase();
  if (!g1 || !g2) return false;
  const gLabel1 = g1 === "male" ? "men" : g1 === "female" ? "women" : null;
  const gLabel2 = g2 === "male" ? "men" : g2 === "female" ? "women" : null;
  if (!gLabel1 || !gLabel2) return false;
  const attracted1 = parseAttractedTo(u1.attracted_to);
  const attracted2 = parseAttractedTo(u2.attracted_to);
  // If attracted_to is unset, fall back to hetero logic (backwards compat)
  const u1WantsU2 = attracted1.size > 0 ? attracted1.has(gLabel2) : g1 !== g2;
  const u2WantsU1 = attracted2.size > 0 ? attracted2.has(gLabel1) : g1 !== g2;
  return u1WantsU2 && u2WantsU1;
}

/**
 * Build all candidate pairs for eligible users with scores.
 * Each unordered pair is scored exactly once (score is symmetric).
 * Sorted by score desc, then a, then b for determinism.
 */
export function buildAllPairs(
  users: MatchUser[],
  questions: Question[],
  options: PairingOptions = {}
): PairWithScore[] {
  const { pairingMode = "friends" } = options;
  const pairs: PairWithScore[] = [];

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const u1 = users[i];
      const u2 = users[j];

      if (pairingMode === "dating") {
        if (!canDatePair(u1, u2)) continue;
      }

      const score = scoreOnly(u1.answers, u2.answers, questions);
      if (score === null) continue;

      const [a, b] = [u1.id, u2.id].sort();
      pairs.push({ a, b, score });
    }
  }

  pairs.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    if (x.a !== y.a) return x.a.localeCompare(y.a);
    return x.b.localeCompare(y.b);
  });

  return pairs;
}

/**
 * Greedy disjoint matching: pick pairs so each attendee appears in at most one pair.
 * Uses pairs in order (already sorted by score desc). Deterministic.
 * Mutates excludePairKeys by adding chosen pairs.
 */
export function pickDisjointPairs(
  pairs: PairWithScore[],
  excludePairKeys: Set<string>
): PairWithScore[] {
  const chosen: PairWithScore[] = [];
  const used = new Set<string>();

  for (const p of pairs) {
    const key = `${p.a}_${p.b}`;
    if (excludePairKeys.has(key)) continue;
    if (used.has(p.a) || used.has(p.b)) continue;
    chosen.push(p);
    used.add(p.a);
    used.add(p.b);
    excludePairKeys.add(key);
  }

  return chosen;
}

/** Normalize (a,b) to a stable key for deduplication (a <= b). */
export function pairKey(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `${x}_${y}`;
}

/**
 * Compute pair assignments for a single round only.
 * - Eligible users must not already have a match in this round (caller filters).
 * - excludePairKeys: pairs that already exist in match_results for this event (any round).
 * Does not mutate excludePairKeys.
 */
export function computeSingleRound(
  users: MatchUser[],
  questions: Question[],
  excludePairKeys: Set<string>,
  options: PairingOptions = {}
): PairWithScore[] {
  if (users.length < 2) return [];
  const allPairs = buildAllPairs(users, questions, options);
  const excludeCopy = new Set(excludePairKeys);
  return pickDisjointPairs(allPairs, excludeCopy);
}

/**
 * Compute round 1, 2, 3 pair assignments.
 * Each round: every attendee appears in at most one pair; no pair is repeated across rounds.
 */
export function computeRoundPairings(
  users: MatchUser[],
  questions: Question[],
  options: PairingOptions = {}
): { round1: PairWithScore[]; round2: PairWithScore[]; round3: PairWithScore[] } {
  const allPairs = buildAllPairs(users, questions, options);
  const usedPairKeys = new Set<string>();

  const round1 = pickDisjointPairs(allPairs, usedPairKeys);
  const round2 = pickDisjointPairs(allPairs, usedPairKeys);
  const round3 = pickDisjointPairs(allPairs, usedPairKeys);

  return { round1, round2, round3 };
}

/**
 * Two-pass matching for Dating events.
 *
 * Pass 1: date pairs (male↔female only).
 * Pass 2: for users left without a date match in Pass 1, run a friends-mode
 *         pairing (same-gender allowed) as a fallback.
 *
 * Does not modify `computeSingleRound`, `buildAllPairs`, or `pickDisjointPairs`.
 * Does not mutate the passed-in `excludePairKeys` set.
 *
 * @returns pairs  — all pairs (date + friend fallback) for this round
 *          matchTypes — map from pairKey → 'date' | 'friend'
 */
export function computeSingleRoundWithFallback(
  users: MatchUser[],
  questions: Question[],
  excludePairKeys: Set<string>
): { pairs: PairWithScore[]; matchTypes: Record<string, "date" | "friend"> } {
  const matchTypes: Record<string, "date" | "friend"> = {};

  if (users.length < 2) return { pairs: [], matchTypes };

  // We work on a copy so we never mutate the caller's set.
  const excludeCopy = new Set(excludePairKeys);

  // ── Pass 1: date pairs (male↔female) ──────────────────────────────────────
  const datePairs = buildAllPairs(users, questions, { pairingMode: "dating" });
  const chosenDatePairs = pickDisjointPairs(datePairs, excludeCopy);

  const matchedInPass1 = new Set<string>();
  for (const p of chosenDatePairs) {
    const key = pairKey(p.a, p.b);
    matchTypes[key] = "date";
    matchedInPass1.add(p.a);
    matchedInPass1.add(p.b);
  }

  // ── Pass 2: friend fallback for unmatched users ───────────────────────────
  const unmatchedUsers = users.filter((u) => !matchedInPass1.has(u.id));
  let chosenFriendPairs: PairWithScore[] = [];

  if (unmatchedUsers.length >= 2) {
    const friendPairs = buildAllPairs(unmatchedUsers, questions, {
      pairingMode: "friends",
    });
    chosenFriendPairs = pickDisjointPairs(friendPairs, excludeCopy);

    for (const p of chosenFriendPairs) {
      const key = pairKey(p.a, p.b);
      matchTypes[key] = "friend";
    }
  }

  return {
    pairs: [...chosenDatePairs, ...chosenFriendPairs],
    matchTypes,
  };
}
