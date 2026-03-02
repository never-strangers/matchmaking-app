import type { MatchUser, Question } from "@/types/questionnaire";
import { getMatchesForUser } from "./questionnaireMatch";

export type PairWithScore = {
  a: string;
  b: string;
  score: number;
};

/**
 * Build all candidate pairs for eligible users with scores.
 * Pairs are normalized (a < b lexicographically). Sorted by score desc, then a, then b for determinism.
 */
export function buildAllPairs(
  users: MatchUser[],
  questions: Question[]
): PairWithScore[] {
  const pairMap = new Map<string, number>();

  for (const user of users) {
    const candidates = users.filter((u) => u.id !== user.id);
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
 */
function pickDisjointPairs(
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

/**
 * Compute round 1, 2, 3 pair assignments.
 * Each round: every attendee appears in at most one pair; no pair is repeated across rounds.
 */
export function computeRoundPairings(
  users: MatchUser[],
  questions: Question[]
): { round1: PairWithScore[]; round2: PairWithScore[]; round3: PairWithScore[] } {
  const allPairs = buildAllPairs(users, questions);
  const usedPairKeys = new Set<string>();

  const round1 = pickDisjointPairs(
    allPairs,
    usedPairKeys
  );
  const round2 = pickDisjointPairs(
    allPairs,
    usedPairKeys
  );
  const round3 = pickDisjointPairs(
    allPairs,
    usedPairKeys
  );

  return { round1, round2, round3 };
}
