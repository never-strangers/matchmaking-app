import {
  MatchUser,
  MatchResult,
  QuestionnaireAnswers,
  AnswerValue,
  Question,
} from "@/types/questionnaire";
import { QUESTIONS } from "@/lib/questionnaire/questions";

/**
 * Calculate similarity for a single question
 * @param a Answer from user A (1-4)
 * @param b Answer from user B (1-4)
 * @returns Similarity score 0-1 (1 = identical, 0 = maximum difference)
 */
function questionSimilarity(a: AnswerValue, b: AnswerValue): number {
  const diff = Math.abs(a - b); // 0-3
  return 1 - diff / 3; // Maps: 0→1, 1→0.67, 2→0.33, 3→0
}

/**
 * Check if a dealbreaker is violated
 * @param question The question definition
 * @param a Answer from user A
 * @param b Answer from user B
 * @returns true if dealbreaker is violated (should exclude candidate)
 */
function isDealbreakerViolated(
  question: Question,
  a: AnswerValue,
  b: AnswerValue
): boolean {
  if (!question.isDealbreaker) return false;
  const diff = Math.abs(a - b);
  return diff >= 2; // Dealbreaker violated if answers differ by 2+ points
}

/**
 * Calculate weighted match score between two users
 * @param userA Current user's answers
 * @param userB Candidate user's answers
 * @param questions Question definitions
 * @returns Match score 0-100, or null if dealbreaker violated
 */
function calculateMatchScore(
  userA: QuestionnaireAnswers,
  userB: QuestionnaireAnswers,
  questions: Question[]
): number | null {
  let totalWeightedSimilarity = 0;
  let totalWeight = 0;

  for (const question of questions) {
    const answerA = userA[question.id];
    const answerB = userB[question.id];

    // Skip if either user hasn't answered this question
    if (!answerA || !answerB) continue;

    // Check dealbreaker first
    if (isDealbreakerViolated(question, answerA, answerB)) {
      return null; // Candidate excluded due to dealbreaker
    }

    // Calculate similarity
    const sim = questionSimilarity(answerA, answerB);
    const weight = question.weight || 1;

    totalWeightedSimilarity += weight * sim;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  // Calculate weighted average and convert to 0-100 scale
  const score = Math.round((totalWeightedSimilarity / totalWeight) * 100);
  return score;
}

/**
 * Generate explanation strings for aligned questions
 * @param userA Current user's answers
 * @param userB Candidate user's answers
 * @param questions Question definitions
 * @param topN Number of top alignments to return
 * @returns Array of explanation strings
 */
function getAlignedReasons(
  userA: QuestionnaireAnswers,
  userB: QuestionnaireAnswers,
  questions: Question[],
  topN: number = 3
): string[] {
  const alignments: Array<{ question: Question; similarity: number }> = [];

  for (const question of questions) {
    const answerA = userA[question.id];
    const answerB = userB[question.id];

    if (!answerA || !answerB) continue;

    const sim = questionSimilarity(answerA, answerB);
    alignments.push({ question, similarity: sim });
  }

  // Sort by similarity (highest first), prefer perfect matches (sim = 1)
  alignments.sort((a, b) => {
    if (a.similarity === 1 && b.similarity !== 1) return -1;
    if (b.similarity === 1 && a.similarity !== 1) return 1;
    return b.similarity - a.similarity;
  });

  // Take top N and format as explanation strings
  return alignments.slice(0, topN).map(({ question }) => {
    const answerA = userA[question.id];
    const answerB = userB[question.id];
    
    // Determine agreement level
    if (answerA === answerB) {
      if (answerA === 4 || answerA === 1) {
        return `You both strongly agree: ${question.text}`;
      }
      return `You both agree: ${question.text}`;
    }
    return `You align on: ${question.text}`;
  });
}

/**
 * Generate explanation strings for mismatched questions
 * @param userA Current user's answers
 * @param userB Candidate user's answers
 * @param questions Question definitions
 * @param topN Number of top mismatches to return
 * @returns Array of explanation strings
 */
function getMismatchedReasons(
  userA: QuestionnaireAnswers,
  userB: QuestionnaireAnswers,
  questions: Question[],
  topN: number = 2
): string[] {
  const mismatches: Array<{ question: Question; similarity: number }> = [];

  for (const question of questions) {
    const answerA = userA[question.id];
    const answerB = userB[question.id];

    if (!answerA || !answerB) continue;

    const sim = questionSimilarity(answerA, answerB);
    // Only include actual mismatches (sim < 1)
    if (sim < 1) {
      mismatches.push({ question, similarity: sim });
    }
  }

  // Sort by similarity (lowest first), prefer strong mismatches (sim close to 0)
  mismatches.sort((a, b) => a.similarity - b.similarity);

  // Take top N and format as explanation strings
  return mismatches.slice(0, topN).map(({ question }) => {
    return `You differ on: ${question.text}`;
  });
}

/**
 * Get matches for a user based on questionnaire answers
 * @param currentUser Current user with their answers
 * @param candidates Array of candidate users to match against
 * @param questions Question definitions (defaults to QUESTIONS)
 * @returns Array of match results, sorted by score (highest first)
 */
export function getMatchesForUser(
  currentUser: MatchUser,
  candidates: MatchUser[],
  questions: Question[] = QUESTIONS
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const candidate of candidates) {
    // Skip self
    if (candidate.id === currentUser.id) continue;

    // Calculate match score
    const score = calculateMatchScore(
      currentUser.answers,
      candidate.answers,
      questions
    );

    // Skip if dealbreaker violated (score is null)
    if (score === null) continue;

    // Generate explanations
    const aligned = getAlignedReasons(
      currentUser.answers,
      candidate.answers,
      questions,
      3
    );
    const mismatched = getMismatchedReasons(
      currentUser.answers,
      candidate.answers,
      questions,
      2
    );

    results.push({
      user: candidate,
      score,
      aligned,
      mismatched,
    });
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  return results;
}

