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

function isKnownGender(g: string | undefined): g is "male" | "female" {
  return g === "male" || g === "female";
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
        const g1 = u1.gender?.toLowerCase();
        const g2 = u2.gender?.toLowerCase();
        if (!isKnownGender(g1) || !isKnownGender(g2)) continue;
        if (g1 === g2) continue;
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
