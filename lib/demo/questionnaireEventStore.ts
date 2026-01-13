"use client";

import { EventQuestionnaireAnswers } from "@/types/questionnaire-event";
import { QuestionnaireAnswers } from "@/types/questionnaire";

const QUESTIONNAIRE_EVENTS_KEY = "ns_questionnaire_events";
const QUESTIONNAIRE_VERSION = "1.0"; // Current version

/**
 * Get all per-event questionnaire answers
 */
function listEventQuestionnaires(): EventQuestionnaireAnswers[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(QUESTIONNAIRE_EVENTS_KEY);
  if (!stored) {
    // Check if central init already ran
    const initFlag = localStorage.getItem("ns_demo_initialized_v2");
    if (initFlag !== "true") {
      // Try central init
      try {
        const { initializeDemoData } = require("./initDemoData");
        initializeDemoData();
        const retry = localStorage.getItem(QUESTIONNAIRE_EVENTS_KEY);
        if (retry) {
          return JSON.parse(retry);
        }
      } catch {
        // Fallback
        seedEventQuestionnaires();
        return listEventQuestionnaires();
      }
    }
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Seed demo event questionnaires
 */
function seedEventQuestionnaires(): void {
  if (typeof window === "undefined") return;
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const questionnaires: EventQuestionnaireAnswers[] = [
    // Anna: Complete + Locked (Coffee event)
    {
      id: "q_anna_coffee",
      eventId: "event_coffee",
      userId: "anna",
      answers: {
        q_lifestyle_1: 4,
        q_lifestyle_2: 1,
        q_social_1: 3,
        q_social_4: 4,
        q_values_1: 4,
        q_lifestyle_3: 4,
        q_lifestyle_4: 4,
        q_lifestyle_5: 2,
        q_social_2: 3,
        q_social_3: 3,
        q_values_2: 4,
        q_values_3: 4,
      },
      questionnaireVersion: "1.0",
      completed: true,
      locked: true,
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    // Alex: Complete but not locked (Coffee event, hold)
    {
      id: "q_alex_coffee",
      eventId: "event_coffee",
      userId: "alex",
      answers: {
        q_lifestyle_1: 3,
        q_lifestyle_2: 2,
        q_social_1: 4,
        q_social_4: 4,
        q_values_1: 4,
        q_lifestyle_3: 3,
        q_lifestyle_4: 4,
        q_lifestyle_5: 2,
        q_social_2: 3,
        q_social_3: 3,
      },
      questionnaireVersion: "1.0",
      completed: true,
      locked: false,
      createdAt: tenMinutesAgo,
      updatedAt: tenMinutesAgo,
    },
    // Daniel: Incomplete (Coffee event, waitlisted)
    {
      id: "q_daniel_coffee",
      eventId: "event_coffee",
      userId: "daniel",
      answers: {
        q_lifestyle_1: 3,
        q_lifestyle_2: 2,
        q_social_1: 3,
        q_social_4: 3,
        q_values_1: 3,
      },
      questionnaireVersion: "1.0",
      completed: false,
      locked: false,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
    // James: Complete + Locked (Running event)
    {
      id: "q_james_running",
      eventId: "event_running",
      userId: "james",
      answers: {
        q_lifestyle_3: 4,
        q_lifestyle_4: 4,
        q_social_1: 3,
        q_values_2: 4,
        q_lifestyle_1: 3,
        q_lifestyle_2: 4,
        q_lifestyle_5: 4,
        q_social_2: 3,
        q_social_3: 3,
        q_social_4: 4,
        q_values_1: 4,
        q_values_3: 4,
      },
      questionnaireVersion: "1.0",
      completed: true,
      locked: true,
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    // Chris: Complete but not locked (Running event, hold - needs payment)
    {
      id: "q_chris_running",
      eventId: "event_running",
      userId: "chris",
      answers: {
        q_lifestyle_3: 3,
        q_lifestyle_4: 4,
        q_social_1: 3,
        q_values_2: 4,
        q_lifestyle_1: 3,
        q_lifestyle_2: 2,
        q_lifestyle_5: 2,
        q_social_2: 3,
        q_social_3: 3,
        q_social_4: 4,
        q_values_1: 4,
        q_values_3: 4,
      },
      questionnaireVersion: "1.0",
      completed: true,
      locked: false, // Not locked because RSVP is only on hold
      createdAt: tenMinutesAgo,
      updatedAt: tenMinutesAgo,
    },
  ];

  localStorage.setItem(QUESTIONNAIRE_EVENTS_KEY, JSON.stringify(questionnaires));
}

/**
 * Get questionnaire answers for user and event
 */
export function getEventQuestionnaire(
  eventId: string,
  userId: string
): EventQuestionnaireAnswers | null {
  const questionnaires = listEventQuestionnaires();
  return (
    questionnaires.find(
      (q) => q.eventId === eventId && q.userId === userId
    ) || null
  );
}

/**
 * Count answered questions
 */
function countAnswers(answers: QuestionnaireAnswers): number {
  return Object.keys(answers).filter((key) => answers[key] !== undefined && answers[key] !== null).length;
}

/**
 * Save questionnaire answers for event
 */
function saveQuestionnaires(questionnaires: EventQuestionnaireAnswers[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUESTIONNAIRE_EVENTS_KEY, JSON.stringify(questionnaires));
}

/**
 * Set questionnaire answers for event
 */
export function setEventQuestionnaire(
  eventId: string,
  userId: string,
  answers: QuestionnaireAnswers
): EventQuestionnaireAnswers {
  const questionnaires = listEventQuestionnaires();
  const existing = questionnaires.find(
    (q) => q.eventId === eventId && q.userId === userId
  );

  const now = new Date().toISOString();
  const answeredCount = countAnswers(answers);
  const completed = answeredCount >= 10;

  if (existing) {
    // Check if locked
    if (existing.locked) {
      throw new Error("Questionnaire is locked. RSVP is already confirmed.");
    }
    existing.answers = answers;
    existing.completed = completed;
    existing.updatedAt = now;
    saveQuestionnaires(questionnaires);
    
    // Update registration questionnaireCompleted status
    if (completed) {
      const { setQuestionnaireCompleted } = require("./registrationStore");
      setQuestionnaireCompleted(eventId, userId, true);
    }
    
    return existing;
  } else {
    const newQuestionnaire: EventQuestionnaireAnswers = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventId,
      userId,
      answers,
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      completed,
      locked: false,
      createdAt: now,
      updatedAt: now,
    };
    questionnaires.push(newQuestionnaire);
    saveQuestionnaires(questionnaires);
    
    // Update registration questionnaireCompleted status
    if (completed) {
      const { setQuestionnaireCompleted } = require("./registrationStore");
      setQuestionnaireCompleted(eventId, userId, true);
    }
    
    return newQuestionnaire;
  }
}

/**
 * Lock questionnaire (called when RSVP is confirmed)
 */
export function lockEventQuestionnaire(
  eventId: string,
  userId: string
): EventQuestionnaireAnswers | null {
  const questionnaires = listEventQuestionnaires();
  const questionnaire = questionnaires.find(
    (q) => q.eventId === eventId && q.userId === userId
  );
  if (!questionnaire) return null;

  questionnaire.locked = true;
  questionnaire.updatedAt = new Date().toISOString();
  saveQuestionnaires(questionnaires);
  return questionnaire;
}

/**
 * Check if questionnaire is complete (>=10 answers)
 */
export function isQuestionnaireComplete(
  eventId: string,
  userId: string
): boolean {
  const questionnaire = getEventQuestionnaire(eventId, userId);
  if (!questionnaire) return false;
  return questionnaire.completed;
}

/**
 * Get questionnaire completion count
 */
export function getQuestionnaireAnswerCount(
  eventId: string,
  userId: string
): number {
  const questionnaire = getEventQuestionnaire(eventId, userId);
  if (!questionnaire) return 0;
  return countAnswers(questionnaire.answers);
}
