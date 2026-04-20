import { describe, it, expect } from "vitest";
import {
  getMatchesForUser,
  getExplanationsForPair,
} from "@/lib/matching/questionnaireMatch";
import type { MatchUser, Question, QuestionnaireAnswers } from "@/types/questionnaire";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const Q_NORMAL: Question = { id: "q1", text: "I like parties", category: "Lifestyle", weight: 1 };
const Q_HEAVY: Question = { id: "q2", text: "I value deep talks", category: "Social", weight: 2 };
const Q_DEALBREAKER: Question = { id: "q3", text: "I prefer staying in", category: "Lifestyle", weight: 1, isDealbreaker: true };

const QUESTIONS = [Q_NORMAL, Q_HEAVY, Q_DEALBREAKER];

function makeUser(
  id: string,
  answers: QuestionnaireAnswers,
  gender?: string
): MatchUser {
  return { id, name: `User ${id}`, city: "Bangkok", gender, answers };
}

// ─── calculateMatchScore (via getMatchesForUser) ──────────────────────────────

describe("match scoring", () => {
  it("returns 100 for identical answers", () => {
    const answers: QuestionnaireAnswers = { q1: 3, q2: 2, q3: 1 };
    const a = makeUser("a", answers);
    const b = makeUser("b", answers);
    const [result] = getMatchesForUser(a, [b], QUESTIONS);
    expect(result.score).toBe(100);
  });

  it("returns 0 for maximally opposite answers on all questions", () => {
    // answers differ by 3 on every question → similarity = 0 each
    // but q3 is a dealbreaker and diff=3 >= 2, so result should be null → excluded
    const a = makeUser("a", { q1: 1, q2: 1, q3: 1 });
    const b = makeUser("b", { q1: 4, q2: 4, q3: 4 });
    const results = getMatchesForUser(a, [b], QUESTIONS);
    expect(results).toHaveLength(0); // excluded by dealbreaker
  });

  it("gives higher score to closer answers", () => {
    const base: QuestionnaireAnswers = { q1: 2, q2: 2, q3: 2 };
    const close: QuestionnaireAnswers = { q1: 2, q2: 2, q3: 2 }; // identical
    const far: QuestionnaireAnswers = { q1: 3, q2: 3, q3: 2 };   // 1 off on q1/q2
    const current = makeUser("me", base);
    const results = getMatchesForUser(current, [
      makeUser("close", close),
      makeUser("far", far),
    ], QUESTIONS);
    expect(results[0].user.id).toBe("close");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("applies question weights correctly", () => {
    // q2 has weight 2; diff of 1 on q2 should hurt more than diff of 1 on q1 (weight 1)
    const base: QuestionnaireAnswers = { q1: 2, q2: 2, q3: 2 };
    const diffOnHeavy: QuestionnaireAnswers = { q1: 2, q2: 3, q3: 2 }; // diff 1 on weight-2 q
    const diffOnLight: QuestionnaireAnswers = { q1: 3, q2: 2, q3: 2 }; // diff 1 on weight-1 q
    const current = makeUser("me", base);
    const results = getMatchesForUser(current, [
      makeUser("heavy", diffOnHeavy),
      makeUser("light", diffOnLight),
    ], QUESTIONS);
    const heavyMatch = results.find((r) => r.user.id === "heavy")!;
    const lightMatch = results.find((r) => r.user.id === "light")!;
    expect(lightMatch.score).toBeGreaterThan(heavyMatch.score);
  });

  it("skips self", () => {
    const answers: QuestionnaireAnswers = { q1: 3, q2: 3, q3: 3 };
    const user = makeUser("me", answers);
    const results = getMatchesForUser(user, [user], QUESTIONS);
    expect(results).toHaveLength(0);
  });

  it("returns results sorted by score descending", () => {
    const me = makeUser("me", { q1: 2, q2: 2, q3: 2 });
    const users = [
      makeUser("a", { q1: 4, q2: 4, q3: 2 }), // far
      makeUser("b", { q1: 2, q2: 2, q3: 2 }), // identical
      makeUser("c", { q1: 3, q2: 2, q3: 2 }), // slightly off
    ];
    const results = getMatchesForUser(me, users, QUESTIONS);
    expect(results.map((r) => r.user.id)).toEqual(["b", "c", "a"]);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("handles empty candidates list", () => {
    const me = makeUser("me", { q1: 2, q2: 2, q3: 2 });
    expect(getMatchesForUser(me, [], QUESTIONS)).toEqual([]);
  });

  it("skips questions not answered by either user", () => {
    const a = makeUser("a", { q1: 3 } as QuestionnaireAnswers);
    const b = makeUser("b", { q1: 3 } as QuestionnaireAnswers);
    // Only q1 answered — no dealbreaker triggered, should still get a score
    const results = getMatchesForUser(a, [b], QUESTIONS);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(100);
  });
});

// ─── Dealbreaker logic ────────────────────────────────────────────────────────

describe("dealbreaker exclusion", () => {
  it("excludes a candidate when dealbreaker answers differ by exactly 2", () => {
    const a = makeUser("a", { q1: 2, q2: 2, q3: 1 });
    const b = makeUser("b", { q1: 2, q2: 2, q3: 3 }); // diff = 2 on q3
    const results = getMatchesForUser(a, [b], QUESTIONS);
    expect(results).toHaveLength(0);
  });

  it("excludes a candidate when dealbreaker answers differ by 3", () => {
    const a = makeUser("a", { q1: 2, q2: 2, q3: 1 });
    const b = makeUser("b", { q1: 2, q2: 2, q3: 4 }); // diff = 3
    const results = getMatchesForUser(a, [b], QUESTIONS);
    expect(results).toHaveLength(0);
  });

  it("does NOT exclude when dealbreaker answers differ by only 1", () => {
    const a = makeUser("a", { q1: 2, q2: 2, q3: 2 });
    const b = makeUser("b", { q1: 2, q2: 2, q3: 3 }); // diff = 1
    const results = getMatchesForUser(a, [b], QUESTIONS);
    expect(results).toHaveLength(1);
  });

  it("does NOT exclude when non-dealbreaker question differs by 3", () => {
    const a = makeUser("a", { q1: 1, q2: 2, q3: 2 });
    const b = makeUser("b", { q1: 4, q2: 2, q3: 2 }); // diff=3 on q1 (not dealbreaker)
    const results = getMatchesForUser(a, [b], QUESTIONS);
    expect(results).toHaveLength(1);
  });
});

// ─── getExplanationsForPair ───────────────────────────────────────────────────

describe("getExplanationsForPair", () => {
  it("returns aligned strings for identical answers", () => {
    const answers: QuestionnaireAnswers = { q1: 4, q2: 4, q3: 3 };
    const { aligned, mismatched } = getExplanationsForPair(answers, answers, QUESTIONS);
    expect(aligned.length).toBeGreaterThan(0);
    expect(aligned[0]).toMatch(/^You both strongly agree:/);
    expect(mismatched).toHaveLength(0);
  });

  it("returns mismatched strings when answers differ", () => {
    const a: QuestionnaireAnswers = { q1: 1, q2: 1, q3: 2 };
    const b: QuestionnaireAnswers = { q1: 4, q2: 4, q3: 2 };
    const { mismatched } = getExplanationsForPair(a, b, QUESTIONS);
    expect(mismatched.length).toBeGreaterThan(0);
    expect(mismatched[0]).toMatch(/differ on/i);
  });

  it("respects alignedTopN and mismatchedTopN options", () => {
    const a: QuestionnaireAnswers = { q1: 3, q2: 3, q3: 3 };
    const b: QuestionnaireAnswers = { q1: 3, q2: 3, q3: 3 };
    const { aligned } = getExplanationsForPair(a, b, QUESTIONS, { alignedTopN: 1 });
    expect(aligned).toHaveLength(1);
  });

  it("uses 'strongly agree' when both answer 4 on the same question", () => {
    const a: QuestionnaireAnswers = { q1: 4, q2: 4, q3: 4 };
    const { aligned } = getExplanationsForPair(a, a, QUESTIONS);
    expect(aligned.some((s) => s.startsWith("You both strongly agree:"))).toBe(true);
  });

  it("uses 'strongly disagree' when both answer 1 (not 'strongly agree')", () => {
    const a: QuestionnaireAnswers = { q1: 1, q2: 1, q3: 1 };
    const { aligned } = getExplanationsForPair(a, a, QUESTIONS);
    expect(aligned.every((s) => !s.includes("strongly agree"))).toBe(true);
    expect(aligned.some((s) => s.startsWith("You both strongly disagree:"))).toBe(true);
  });

  it("uses 'disagree' when both answer 2 (not generic 'You both agree')", () => {
    const a: QuestionnaireAnswers = { q1: 2, q2: 3, q3: 3 };
    const { aligned } = getExplanationsForPair(a, a, [Q_NORMAL]);
    expect(aligned[0]).toMatch(/^You both disagree:/);
    expect(aligned[0]).not.toMatch(/^You both agree:/);
  });

  it("uses 'agree' when both answer 3", () => {
    const a: QuestionnaireAnswers = { q1: 3 };
    const { aligned } = getExplanationsForPair(a, a, [Q_NORMAL]);
    expect(aligned[0]).toMatch(/^You both agree:/);
    expect(aligned[0]).not.toContain("disagree");
  });

  it("labels same-answer alignment with correct Likert word for each value 1–4", () => {
    const Q: Question = { id: "qx", text: "I like being center of attention", category: "Lifestyle", weight: 1 };
    expect(getExplanationsForPair({ qx: 1 }, { qx: 1 }, [Q]).aligned[0]).toBe(
      "You both strongly disagree: I like being center of attention"
    );
    expect(getExplanationsForPair({ qx: 2 }, { qx: 2 }, [Q]).aligned[0]).toBe(
      "You both disagree: I like being center of attention"
    );
    expect(getExplanationsForPair({ qx: 3 }, { qx: 3 }, [Q]).aligned[0]).toBe(
      "You both agree: I like being center of attention"
    );
    expect(getExplanationsForPair({ qx: 4 }, { qx: 4 }, [Q]).aligned[0]).toBe(
      "You both strongly agree: I like being center of attention"
    );
  });
});
