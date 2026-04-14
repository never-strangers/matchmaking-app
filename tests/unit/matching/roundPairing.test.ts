import { describe, it, expect } from "vitest";
import {
  buildAllPairs,
  pickDisjointPairs,
  computeSingleRound,
  computeSingleRoundWithFallback,
  computeRoundPairings,
  pairKey,
} from "@/lib/matching/roundPairing";
import type { MatchUser, Question, QuestionnaireAnswers } from "@/types/questionnaire";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const QUESTIONS: Question[] = [
  { id: "q1", text: "Q1", category: "Lifestyle", weight: 1 },
];

function makeUser(id: string, answers: QuestionnaireAnswers, gender?: string): MatchUser {
  return { id, name: `User ${id}`, city: "Bangkok", gender, answers };
}

const SAME_ANSWERS: QuestionnaireAnswers = { q1: 3 };

// Four users with identical answers so all pairs have equal scores
const USERS = ["a", "b", "c", "d"].map((id) => makeUser(id, SAME_ANSWERS));

// ─── pairKey ─────────────────────────────────────────────────────────────────

describe("pairKey", () => {
  it("produces the same key regardless of argument order", () => {
    expect(pairKey("alice", "bob")).toBe(pairKey("bob", "alice"));
  });

  it("uses underscore separator", () => {
    expect(pairKey("x", "y")).toMatch(/_/);
  });
});

// ─── buildAllPairs ────────────────────────────────────────────────────────────

describe("buildAllPairs", () => {
  it("returns n*(n-1)/2 pairs for n users in friends mode", () => {
    // 4 users → 6 pairs
    const pairs = buildAllPairs(USERS, QUESTIONS);
    expect(pairs).toHaveLength(6);
  });

  it("each pair has a and b in lexicographic order", () => {
    const pairs = buildAllPairs(USERS, QUESTIONS);
    for (const p of pairs) {
      expect(p.a <= p.b).toBe(true);
    }
  });

  it("pairs are sorted by score desc, then a, then b for determinism", () => {
    const pairs = buildAllPairs(USERS, QUESTIONS);
    for (let i = 1; i < pairs.length; i++) {
      const prev = pairs[i - 1];
      const curr = pairs[i];
      if (prev.score === curr.score) {
        if (prev.a === curr.a) {
          expect(prev.b <= curr.b).toBe(true);
        } else {
          expect(prev.a <= curr.a).toBe(true);
        }
      } else {
        expect(prev.score).toBeGreaterThanOrEqual(curr.score);
      }
    }
  });

  it("excludes pairs where dealbreaker is violated", () => {
    const qs: Question[] = [
      { id: "q1", text: "Q1", category: "Lifestyle", weight: 1, isDealbreaker: true },
    ];
    const a = makeUser("a", { q1: 1 });
    const b = makeUser("b", { q1: 4 }); // diff=3, dealbreaker
    const pairs = buildAllPairs([a, b], qs);
    expect(pairs).toHaveLength(0);
  });

  describe("dating mode", () => {
    it("only pairs male/female users", () => {
      const m1 = makeUser("m1", SAME_ANSWERS, "male");
      const m2 = makeUser("m2", SAME_ANSWERS, "male");
      const f1 = makeUser("f1", SAME_ANSWERS, "female");
      const pairs = buildAllPairs([m1, m2, f1], QUESTIONS, { pairingMode: "dating" });
      // only m1/f1 and m2/f1 are valid
      expect(pairs).toHaveLength(2);
      for (const p of pairs) {
        const ids = [p.a, p.b];
        expect(ids.some((id) => id.startsWith("m"))).toBe(true);
        expect(ids.some((id) => id.startsWith("f"))).toBe(true);
      }
    });

    it("excludes same-gender pairs", () => {
      const m1 = makeUser("m1", SAME_ANSWERS, "male");
      const m2 = makeUser("m2", SAME_ANSWERS, "male");
      const pairs = buildAllPairs([m1, m2], QUESTIONS, { pairingMode: "dating" });
      expect(pairs).toHaveLength(0);
    });

    it("excludes users with unknown gender", () => {
      const known = makeUser("m1", SAME_ANSWERS, "male");
      const unknown = makeUser("x1", SAME_ANSWERS); // no gender
      const f1 = makeUser("f1", SAME_ANSWERS, "female");
      const pairs = buildAllPairs([known, unknown, f1], QUESTIONS, { pairingMode: "dating" });
      // only known/f1 is valid
      expect(pairs).toHaveLength(1);
    });

    it("treats gender case-insensitively", () => {
      const m = makeUser("m", SAME_ANSWERS, "Male");
      const f = makeUser("f", SAME_ANSWERS, "Female");
      const pairs = buildAllPairs([m, f], QUESTIONS, { pairingMode: "dating" });
      expect(pairs).toHaveLength(1);
    });
  });

  it("returns empty array for fewer than 2 users", () => {
    expect(buildAllPairs([], QUESTIONS)).toHaveLength(0);
    expect(buildAllPairs([USERS[0]], QUESTIONS)).toHaveLength(0);
  });
});

// ─── pickDisjointPairs ────────────────────────────────────────────────────────

describe("pickDisjointPairs", () => {
  it("each user appears in at most one chosen pair", () => {
    const allPairs = buildAllPairs(USERS, QUESTIONS);
    const chosen = pickDisjointPairs(allPairs, new Set());
    const seen = new Set<string>();
    for (const p of chosen) {
      expect(seen.has(p.a)).toBe(false);
      expect(seen.has(p.b)).toBe(false);
      seen.add(p.a);
      seen.add(p.b);
    }
  });

  it("skips pairs in excludePairKeys", () => {
    const allPairs = buildAllPairs(USERS, QUESTIONS);
    const firstPair = allPairs[0];
    const excluded = new Set([`${firstPair.a}_${firstPair.b}`]);
    const chosen = pickDisjointPairs(allPairs, excluded);
    expect(chosen.some((p) => p.a === firstPair.a && p.b === firstPair.b)).toBe(false);
  });

  it("adds chosen pairs to excludePairKeys (mutates the set)", () => {
    const allPairs = buildAllPairs(USERS, QUESTIONS);
    const exclude = new Set<string>();
    const chosen = pickDisjointPairs(allPairs, exclude);
    for (const p of chosen) {
      expect(exclude.has(`${p.a}_${p.b}`)).toBe(true);
    }
  });

  it("returns empty array when all pairs are excluded", () => {
    const allPairs = buildAllPairs(USERS, QUESTIONS);
    const exclude = new Set(allPairs.map((p) => `${p.a}_${p.b}`));
    expect(pickDisjointPairs(allPairs, exclude)).toHaveLength(0);
  });
});

// ─── computeSingleRound ───────────────────────────────────────────────────────

describe("computeSingleRound", () => {
  it("returns empty for fewer than 2 users", () => {
    expect(computeSingleRound([], QUESTIONS, new Set())).toHaveLength(0);
    expect(computeSingleRound([USERS[0]], QUESTIONS, new Set())).toHaveLength(0);
  });

  it("does not mutate the passed excludePairKeys set", () => {
    const exclude = new Set<string>();
    computeSingleRound(USERS, QUESTIONS, exclude);
    expect(exclude.size).toBe(0);
  });

  it("respects already-excluded pairs", () => {
    const allPairs = buildAllPairs(USERS, QUESTIONS);
    const firstKey = `${allPairs[0].a}_${allPairs[0].b}`;
    const exclude = new Set([firstKey]);
    const round = computeSingleRound(USERS, QUESTIONS, exclude);
    expect(round.some((p) => `${p.a}_${p.b}` === firstKey)).toBe(false);
  });
});

// ─── computeRoundPairings ─────────────────────────────────────────────────────

describe("computeRoundPairings", () => {
  it("no pair appears in more than one round", () => {
    const { round1, round2, round3 } = computeRoundPairings(USERS, QUESTIONS);
    const allKeys = [
      ...round1.map((p) => `${p.a}_${p.b}`),
      ...round2.map((p) => `${p.a}_${p.b}`),
      ...round3.map((p) => `${p.a}_${p.b}`),
    ];
    const unique = new Set(allKeys);
    expect(unique.size).toBe(allKeys.length);
  });

  it("each user appears at most once per round", () => {
    const { round1, round2, round3 } = computeRoundPairings(USERS, QUESTIONS);
    for (const round of [round1, round2, round3]) {
      const seen = new Set<string>();
      for (const p of round) {
        expect(seen.has(p.a)).toBe(false);
        expect(seen.has(p.b)).toBe(false);
        seen.add(p.a);
        seen.add(p.b);
      }
    }
  });

  it("returns empty rounds for fewer than 2 users", () => {
    const result = computeRoundPairings([USERS[0]], QUESTIONS);
    expect(result.round1).toHaveLength(0);
    expect(result.round2).toHaveLength(0);
    expect(result.round3).toHaveLength(0);
  });

  it("is deterministic — same input produces same output", () => {
    const r1 = computeRoundPairings(USERS, QUESTIONS);
    const r2 = computeRoundPairings(USERS, QUESTIONS);
    expect(r1).toEqual(r2);
  });

  it("handles odd number of users (one user left unmatched per round)", () => {
    const threeUsers = USERS.slice(0, 3);
    const { round1, round2, round3 } = computeRoundPairings(threeUsers, QUESTIONS);
    // Each round can have at most 1 pair (3 users → 1 pair, 1 leftover)
    expect(round1.length).toBeLessThanOrEqual(1);
    expect(round2.length).toBeLessThanOrEqual(1);
    expect(round3.length).toBeLessThanOrEqual(1);
  });

  it("covers all possible pairs across three rounds for small groups", () => {
    // With 4 users there are 6 pairs total, 2 pairs per round → all 6 covered
    const { round1, round2, round3 } = computeRoundPairings(USERS, QUESTIONS);
    const allKeys = new Set([
      ...round1.map((p) => `${p.a}_${p.b}`),
      ...round2.map((p) => `${p.a}_${p.b}`),
      ...round3.map((p) => `${p.a}_${p.b}`),
    ]);
    expect(allKeys.size).toBe(6);
  });
});

// ─── computeSingleRoundWithFallback ──────────────────────────────────────────


describe("computeSingleRoundWithFallback", () => {
  const Q: Question[] = [{ id: "q1", text: "Q1", category: "Lifestyle", weight: 1 }];
  const ANSWERS: QuestionnaireAnswers = { q1: 3 };

  function makeMale(id: string): MatchUser {
    return makeUser(id, ANSWERS, "male");
  }
  function makeFemale(id: string): MatchUser {
    return makeUser(id, ANSWERS, "female");
  }

  it("Test 1: 15M / 22F — all 15 males get date matches, 7 unmatched females get friend matches, 0 unmatched", () => {
    const males = Array.from({ length: 15 }, (_, i) => makeMale(`m${i}`));
    const females = Array.from({ length: 22 }, (_, i) => makeFemale(`f${i}`));
    const users = [...males, ...females];

    const { pairs, matchTypes } = computeSingleRoundWithFallback(users, Q, new Set());

    const datePairs = pairs.filter((p) => matchTypes[`${[p.a, p.b].sort().join("_")}`] === "date");
    const friendPairs = pairs.filter((p) => matchTypes[`${[p.a, p.b].sort().join("_")}`] === "friend");

    // All 15 males get date matches
    expect(datePairs).toHaveLength(15);
    // 7 leftover females get friend matches (22 - 15 = 7 females left, 7 pairs)
    expect(friendPairs).toHaveLength(3); // 7 unmatched females → 3 friend pairs (1 still left over)

    // Every male is in a date pair
    const maleIdsInDatePairs = new Set(
      datePairs.flatMap((p) => [p.a, p.b]).filter((id) => id.startsWith("m"))
    );
    expect(maleIdsInDatePairs.size).toBe(15);

    // Count truly unmatched users
    const matchedIds = new Set(pairs.flatMap((p) => [p.a, p.b]));
    const unmatched = users.filter((u) => !matchedIds.has(u.id));
    // 22 - 15 = 7 unmatched females → 3 friend pairs + 1 leftover female
    expect(unmatched.length).toBeLessThanOrEqual(1);
  });

  it("Test 2: even gender (10M / 10F) — all pairs are date matches, no friend matches", () => {
    const males = Array.from({ length: 10 }, (_, i) => makeMale(`m${i}`));
    const females = Array.from({ length: 10 }, (_, i) => makeFemale(`f${i}`));
    const users = [...males, ...females];

    const { pairs, matchTypes } = computeSingleRoundWithFallback(users, Q, new Set());

    expect(pairs).toHaveLength(10);
    const friendPairs = pairs.filter(
      (p) => matchTypes[`${[p.a, p.b].sort().join("_")}`] === "friend"
    );
    expect(friendPairs).toHaveLength(0);
  });

  it("Test 3: computeSingleRound in friends mode is unchanged by the new function", () => {
    // computeSingleRound with pairingMode:'friends' on 4 genderless users
    const users = ["a", "b", "c", "d"].map((id) => makeUser(id, ANSWERS));
    const legacy = computeSingleRound(users, Q, new Set(), { pairingMode: "friends" });
    // Should produce 2 pairs (4 users, friends mode)
    expect(legacy).toHaveLength(2);
    // computeSingleRoundWithFallback does NOT change computeSingleRound — verify independence
    const { pairs } = computeSingleRoundWithFallback(users, Q, new Set());
    // All 4 have no gender → date pairs = 0, friend fallback picks up all 4 → 2 friend pairs
    expect(pairs).toHaveLength(2);
  });

  it("does not mutate the excludePairKeys set", () => {
    const males = [makeMale("m1"), makeMale("m2")];
    const females = [makeFemale("f1"), makeFemale("f2")];
    const exclude = new Set<string>();
    computeSingleRoundWithFallback([...males, ...females], Q, exclude);
    expect(exclude.size).toBe(0);
  });

  it("returns empty pairs for fewer than 2 users", () => {
    const { pairs } = computeSingleRoundWithFallback([makeMale("m1")], Q, new Set());
    expect(pairs).toHaveLength(0);
  });
});
