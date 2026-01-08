/**
 * Questionnaire-based matching types
 */

export type AnswerValue = 1 | 2 | 3 | 4;

export interface Question {
  id: string;
  text: string;
  category: "Lifestyle" | "Social" | "Values" | "Communication";
  weight?: number; // Default 1, can be 2-3 for important questions
  isDealbreaker?: boolean; // If true and diff >= 2, candidate is excluded
}

export type QuestionnaireAnswers = Record<Question["id"], AnswerValue>;

export interface MatchUser {
  id: string;
  name: string;
  city: string;
  gender?: string;
  intent?: string;
  answers: QuestionnaireAnswers;
  lastActiveAt?: string;
}

export interface MatchResult {
  user: MatchUser;
  score: number; // 0-100
  aligned: string[]; // Top 3 question texts where they align
  mismatched: string[]; // Top 1-2 question texts where they differ
}

