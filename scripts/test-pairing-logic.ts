/**
 * Lightweight unit tests for roundPairing logic.
 * Run with: npx tsx scripts/test-pairing-logic.ts
 * Exit 0 on pass, 1 on failure.
 */
import { buildAllPairs, computeSingleRound } from "../lib/matching/roundPairing";
import type { MatchUser, Question } from "../types/questionnaire";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

// Minimal question set for testing
const QUESTIONS: Question[] = [
  { id: "q1", text: "How social are you?", category: "Lifestyle", weight: 1, isDealbreaker: false },
  { id: "q2", text: "Early bird or night owl?", category: "Lifestyle", weight: 1, isDealbreaker: false },
];

function makeUser(id: string, gender: string | undefined, answers: Record<string, 1|2|3|4>): MatchUser {
  return { id, name: id, city: "Bangkok", gender, answers };
}

// ── Test 1: Dating mode — zero same-gender pairs ─────────────────────────
console.log("\n[Test 1] Dating mode: no same-gender pairs");
{
  const users: MatchUser[] = [
    makeUser("f1", "female", { q1: 3, q2: 2 }),
    makeUser("f2", "female", { q1: 3, q2: 2 }),
    makeUser("m1", "male",   { q1: 3, q2: 2 }),
    makeUser("m2", "male",   { q1: 3, q2: 2 }),
    makeUser("f3", "female", { q1: 2, q2: 3 }),
  ];
  const pairs = buildAllPairs(users, QUESTIONS, { pairingMode: "dating" });
  const samePairs = pairs.filter((p) => {
    const a = users.find((u) => u.id === p.a)!;
    const b = users.find((u) => u.id === p.b)!;
    return a.gender === b.gender;
  });
  assert(samePairs.length === 0, `No same-gender pairs in dating mode (found ${samePairs.length})`);
  assert(pairs.length > 0, `Some opposite-gender pairs exist (found ${pairs.length})`);
}

// ── Test 2: Dating mode — unknown gender excluded ─────────────────────────
console.log("\n[Test 2] Dating mode: unknown/missing gender excluded");
{
  const users: MatchUser[] = [
    makeUser("f1", "female",    { q1: 3, q2: 3 }),
    makeUser("m1", "male",      { q1: 3, q2: 3 }),
    makeUser("o1", "other",     { q1: 3, q2: 3 }),  // should be excluded
    makeUser("u1", undefined,   { q1: 3, q2: 3 }),  // should be excluded
  ];
  const pairs = buildAllPairs(users, QUESTIONS, { pairingMode: "dating" });
  const involveOther = pairs.some((p) => p.a === "o1" || p.b === "o1" || p.a === "u1" || p.b === "u1");
  assert(!involveOther, "Unknown/other gender users not included in dating pairs");
  assert(pairs.length === 1, `Exactly 1 male↔female pair (found ${pairs.length})`);
}

// ── Test 3: Friends mode — same-gender pairs allowed ─────────────────────
console.log("\n[Test 3] Friends mode: same-gender pairs allowed");
{
  const users: MatchUser[] = [
    makeUser("f1", "female", { q1: 4, q2: 4 }),
    makeUser("f2", "female", { q1: 4, q2: 4 }),
    makeUser("m1", "male",   { q1: 2, q2: 2 }),
  ];
  const pairs = buildAllPairs(users, QUESTIONS, { pairingMode: "friends" });
  const ffPair = pairs.some((p) => (p.a === "f1" && p.b === "f2") || (p.a === "f2" && p.b === "f1"));
  assert(ffPair, "Female↔female pair exists in friends mode");
  assert(pairs.length === 3, `All 3 pairs generated (found ${pairs.length})`);
}

// ── Test 4: Friends mode — other/unknown gender included ─────────────────
console.log("\n[Test 4] Friends mode: other/unknown gender included");
{
  const users: MatchUser[] = [
    makeUser("f1", "female",  { q1: 3, q2: 3 }),
    makeUser("o1", "other",   { q1: 3, q2: 3 }),
    makeUser("u1", undefined, { q1: 3, q2: 3 }),
  ];
  const pairs = buildAllPairs(users, QUESTIONS, { pairingMode: "friends" });
  assert(pairs.length === 3, `All 3 pairs generated including other/unknown (found ${pairs.length})`);
}

// ── Test 5: Default mode is friends ──────────────────────────────────────
console.log("\n[Test 5] Default pairingMode is friends");
{
  const users: MatchUser[] = [
    makeUser("f1", "female", { q1: 3, q2: 3 }),
    makeUser("f2", "female", { q1: 3, q2: 3 }),
  ];
  const pairs = buildAllPairs(users, QUESTIONS); // no options → default
  assert(pairs.length === 1, "Default mode allows female↔female pair");
}

// ── Test 6: computeSingleRound respects pairingMode ───────────────────────
console.log("\n[Test 6] computeSingleRound with pairingMode=dating excludes same-gender");
{
  const users: MatchUser[] = [
    makeUser("f1", "female", { q1: 3, q2: 2 }),
    makeUser("f2", "female", { q1: 3, q2: 2 }),
    makeUser("m1", "male",   { q1: 3, q2: 2 }),
  ];
  const pairs = computeSingleRound(users, QUESTIONS, new Set(), { pairingMode: "dating" });
  const samePairs = pairs.filter((p) => {
    const a = users.find((u) => u.id === p.a)!;
    const b = users.find((u) => u.id === p.b)!;
    return a.gender === b.gender;
  });
  assert(samePairs.length === 0, "computeSingleRound: no same-gender pairs in dating mode");
  assert(pairs.length === 1, "computeSingleRound: 1 male↔female pair with odd counts");
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log(`\n✅ All tests passed`);
  process.exit(0);
}
