/**
 * Event questionnaire template configuration
 */
export interface EventQuestionnaireTemplate {
  questionIds: string[];
  weights?: Record<string, number>; // questionId -> weight
  dealbreakers?: string[]; // questionIds that are dealbreakers
}

/**
 * Event model
 */
export interface Event {
  id: string;
  title: string;
  city: string;
  datetime: string; // ISO string (start time)
  endTime?: string; // ISO string (end time, defaults to datetime + 3 hours if not set)
  description?: string;
  capacity?: number;
  questionnaireTemplate: EventQuestionnaireTemplate;
  requiresApproval: boolean;
  requiresPayment: boolean;
  createdByAdminId: string;
  createdAt: string;
}

