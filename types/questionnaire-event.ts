import { QuestionnaireAnswers } from "./questionnaire";

/**
 * Per-event questionnaire answers
 */
export interface EventQuestionnaireAnswers {
  id: string;
  eventId: string;
  userId: string;
  answers: QuestionnaireAnswers;
  questionnaireVersion: string; // Version of questions used
  completed: boolean; // true if >= 10 answers
  locked: boolean; // true if RSVP is CONFIRMED
  createdAt: string;
  updatedAt: string;
}
