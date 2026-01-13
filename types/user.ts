import { QuestionnaireAnswers } from "./questionnaire";

/**
 * User approval status
 */
export type UserStatus = "pending_approval" | "approved" | "rejected" | "unverified";

/**
 * Gender options
 */
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

/**
 * Orientation/attraction preferences
 */
export interface OrientationPreferences {
  attractedTo: Gender[]; // Which genders user is attracted to
  lookingFor: ("friends" | "date" | "professional")[]; // What they're looking for
}

import { Role } from "./roles";

/**
 * User profile with questionnaire answers and approval status
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: Gender;
  city: string;
  cityLocked: boolean; // Locked after approval
  cityChangeRequested?: string; // Requested new city (requires admin approval)
  orientation?: OrientationPreferences;
  profilePhotoUrl?: string;
  questionnaireAnswers: QuestionnaireAnswers; // Global/default answers
  status: UserStatus;
  emailVerified: boolean; // OTP verified
  role: Role; // User role: guest, user, host, admin
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  notes?: string; // Admin internal notes
}

