import type { MatchUser, Question } from "@/types/questionnaire";
import { getMatchesForUser } from "./questionnaireMatch";

export type PairWithScore = {
  a: string;
  b: string;
  score: number;
};

export type PairingOptions = {
  /** When true, only opposite-gender pairs are considered (dating events). */
  datingOnly?: boolean;
};

/**
 * Build all candidate pairs for eligible users with scores.
 * Pairs are normalized (a < b lexicographically). Sorted by score desc, then a, then b for determinism.
 *
 * When options.datingOnly is true, only male↔female pairs are generated.
 * MatchUser.gender must be 'male' or 'female'. Users with unknown/missing gender are excluded.
 */
export function buildAllPairs(
  users: MatchUser[],
  questions: Question[],
  options: PairingOptions = {}
): PairWithScore[] {
  const pairMap = new Map<string, number>();
  const { datingOnly = false } = options;

  for (const user of users) {
    const candidates = users.filter((u) => {
      if (u.id === user.id) return false;
      if (datingOnly) {
        const g1 = user.gender?.toLowerCase();
        const g2 = u.gender?.toLowerCase();
        // Strict opposite-gender only: both genders must be known and different
        const known = (g: string | undefined): g is "male" | "female" =>
          g === "male" || g === "female";
        if (!known(g1) || !known(g2)) return false; // exclude unknown genders
        if (g1 === g2) return false;                 // exclude same-gender
      }
      return true;
    });

    const matches = getMatchesForUser(user, candidates, questions);
    for (const m of matches) {
      const other = m.user;
      const [a, b] = [user.id, other.id].sort();
      const key = `${a}_${b}`;
      if (!pairMap.has(key)) {
        pairMap.set(key, m.score);
      }
    }
  }

  const pairs: PairWithScore[] = [];
  for (const [key, score] of pairMap) {
    const [a, b] = key.split("_");
    pairs.push({ a, b, score });
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
