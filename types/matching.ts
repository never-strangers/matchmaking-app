/**
 * Matching result for a specific event
 */
export interface MatchResult {
  id: string;
  eventId: string;
  userId1: string;
  userId2: string;
  score: number; // 0-100
  createdAt: string;
}

/**
 * Matching run for an event
 */
export interface MatchingRun {
  id: string;
  eventId: string;
  runAt: string; // ISO timestamp
  totalMatches: number;
  status: "completed" | "failed";
}

/**
 * Like/pass action on a match
 */
export type MatchAction = "like" | "pass";

/**
 * User's action on a match
 */
export interface MatchActionRecord {
  id: string;
  eventId: string;
  matchId: string; // MatchResult.id
  userId: string;
  action: MatchAction;
  createdAt: string;
}

/**
 * Mutual like record (unlocks chat)
 */
export interface MutualLike {
  id: string;
  eventId: string;
  userId1: string;
  userId2: string;
  matchId: string; // MatchResult.id
  createdAt: string;
}
