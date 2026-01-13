"use client";

import { MatchResult, MatchingRun, MatchActionRecord, MutualLike } from "@/types/matching";
import { getUserById } from "./userStore";
import { getMatchesForUser } from "@/lib/matching/questionnaireMatch";
import { MatchUser } from "@/types/questionnaire";
import { EventQuestionnaireAnswers } from "@/types/questionnaire-event";
import { getEventQuestionnaire } from "./questionnaireEventStore";
import { QUESTIONS } from "@/lib/questionnaire/questions";

const MATCHES_KEY = "ns_matches";
const MATCHING_RUNS_KEY = "ns_matching_runs";
const MATCH_ACTIONS_KEY = "ns_match_actions";
const MUTUAL_LIKES_KEY = "ns_mutual_likes";

// Max matches per person per event
const MAX_MATCHES_PER_PERSON = 3;

/**
 * Get all match results
 */
function listMatchResults(): MatchResult[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(MATCHES_KEY);
  if (!stored) {
    const initFlag = localStorage.getItem("ns_demo_initialized_v2");
    if (initFlag !== "true") {
      try {
        const { initializeDemoData } = require("./initDemoData");
        initializeDemoData();
        const retry = localStorage.getItem(MATCHES_KEY);
        if (retry) {
          return JSON.parse(retry);
        }
      } catch {
        seedMatches();
        return listMatchResults();
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
 * Seed demo matches
 */
function seedMatches(): void {
  if (typeof window === "undefined") return;
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const matches: MatchResult[] = [
    // Anna matched with Alex (Coffee event)
    {
      id: "match_anna_alex",
      eventId: "event_coffee",
      userId1: "anna",
      userId2: "alex",
      score: 85,
      createdAt: oneHourAgo,
    },
  ];

  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
  console.log("✅ Seeded demo matches:", matches);
}

/**
 * Get all matching runs
 */
function listMatchingRuns(): MatchingRun[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(MATCHING_RUNS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Check if matching has been run for an event
 */
export function hasMatchingRun(eventId: string): boolean {
  const runs = listMatchingRuns();
  return runs.some((r) => r.eventId === eventId && r.status === "completed");
}

/**
 * Get all match actions
 */
function listMatchActions(): MatchActionRecord[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(MATCH_ACTIONS_KEY);
  if (!stored) {
    const initFlag = localStorage.getItem("ns_demo_initialized_v2");
    if (initFlag !== "true") {
      try {
        const { initializeDemoData } = require("./initDemoData");
        initializeDemoData();
        const retry = localStorage.getItem(MATCH_ACTIONS_KEY);
        if (retry) {
          return JSON.parse(retry);
        }
      } catch {
        seedMatchActions();
        return listMatchActions();
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
 * Seed demo match actions
 */
function seedMatchActions(): void {
  if (typeof window === "undefined") return;
  const now = new Date().toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const actions: MatchActionRecord[] = [
    // Anna liked Alex
    {
      id: "action_anna_alex",
      eventId: "event_coffee",
      matchId: "match_anna_alex",
      userId: "anna",
      action: "like",
      createdAt: tenMinutesAgo,
    },
    // Alex liked Anna (mutual like)
    {
      id: "action_alex_anna",
      eventId: "event_coffee",
      matchId: "match_anna_alex",
      userId: "alex",
      action: "like",
      createdAt: tenMinutesAgo,
    },
  ];

  localStorage.setItem(MATCH_ACTIONS_KEY, JSON.stringify(actions));
}

/**
 * Get all mutual likes
 */
function listMutualLikes(): MutualLike[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(MUTUAL_LIKES_KEY);
  if (!stored) {
    const initFlag = localStorage.getItem("ns_demo_initialized_v2");
    if (initFlag !== "true") {
      try {
        const { initializeDemoData } = require("./initDemoData");
        initializeDemoData();
        const retry = localStorage.getItem(MUTUAL_LIKES_KEY);
        if (retry) {
          return JSON.parse(retry);
        }
      } catch {
        seedMutualLikes();
        return listMutualLikes();
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
 * Seed demo mutual likes
 */
function seedMutualLikes(): void {
  if (typeof window === "undefined") return;
  const now = new Date().toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const mutualLikes: MutualLike[] = [
    // Anna and Alex mutually liked each other
    {
      id: "mutual_anna_alex",
      eventId: "event_coffee",
      userId1: "anna",
      userId2: "alex",
      matchId: "match_anna_alex",
      createdAt: tenMinutesAgo,
    },
  ];

  localStorage.setItem(MUTUAL_LIKES_KEY, JSON.stringify(mutualLikes));
}

/**
 * Save functions
 */
function saveMatchResults(matches: MatchResult[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
}

function saveMatchingRuns(runs: MatchingRun[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MATCHING_RUNS_KEY, JSON.stringify(runs));
}

function saveMatchActions(actions: MatchActionRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MATCH_ACTIONS_KEY, JSON.stringify(actions));
}

function saveMutualLikes(likes: MutualLike[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTUAL_LIKES_KEY, JSON.stringify(likes));
}

/**
 * Get historical matches (any previous event)
 */
function getHistoricalMatches(userId1: string, userId2: string): MatchResult[] {
  const matches = listMatchResults();
  return matches.filter(
    (m) =>
      (m.userId1 === userId1 && m.userId2 === userId2) ||
      (m.userId1 === userId2 && m.userId2 === userId1)
  );
}

/**
 * Check if users match gender/orientation preferences
 */
function matchesOrientation(user1: MatchUser, user2: MatchUser): boolean {
  // If no orientation data, allow match
  if (!user1.gender || !user2.gender) return true;

  // Get full user profiles for orientation
  const profile1 = getUserById(user1.id);
  const profile2 = getUserById(user2.id);

  if (!profile1?.orientation || !profile2?.orientation) return true;

  // Check if user1 is attracted to user2's gender
  const user1Attracted = profile1.orientation.attractedTo.includes(
    profile2.gender as any
  );
  const user2Attracted = profile2.orientation.attractedTo.includes(
    profile1.gender as any
  );

  // Both must be attracted to each other
  return user1Attracted && user2Attracted;
}

/**
 * Get matches for event
 */
export function getMatchesForEvent(eventId: string): MatchResult[] {
  const matches = listMatchResults();
  const eventMatches = matches.filter((m) => m.eventId === eventId);
  
  // Debug: log if no matches found for coffee event
  if (eventId === "event_coffee" && eventMatches.length === 0) {
    console.log("🔍 No matches found for event_coffee. All matches:", matches);
  }
  
  return eventMatches;
}

/**
 * Get matches for user in event
 */
export function getUserMatchesForEvent(
  eventId: string,
  userId: string
): MatchResult[] {
  // Ensure seed data exists first
  const allMatches = listMatchResults();
  
  // If no matches at all and this is coffee event, ensure demo match exists
  if (allMatches.length === 0 && eventId === "event_coffee") {
    seedMatches();
    // Also seed mutual likes and actions
    const storedActions = localStorage.getItem(MATCH_ACTIONS_KEY);
    if (!storedActions || JSON.parse(storedActions).length === 0) {
      seedMatchActions();
    }
    const storedLikes = localStorage.getItem(MUTUAL_LIKES_KEY);
    if (!storedLikes || JSON.parse(storedLikes).length === 0) {
      seedMutualLikes();
    }
  }
  
  const matches = getMatchesForEvent(eventId);
  const userMatches = matches.filter(
    (m) => m.userId1 === userId || m.userId2 === userId
  );
  
  // Deduplicate: if same pair appears twice (e.g., A-B and B-A), keep only one
  const seenPairs = new Set<string>();
  const deduplicated: MatchResult[] = [];
  
  for (const match of userMatches) {
    const pairKey = [match.userId1, match.userId2].sort().join("_");
    if (!seenPairs.has(pairKey)) {
      seenPairs.add(pairKey);
      deduplicated.push(match);
    }
  }
  
  return deduplicated;
}

/**
 * Run matching for event
 */
export function runMatchingForEvent(
  eventId: string,
  userIds: string[],
  eventQuestionnaires: Map<string, EventQuestionnaireAnswers>
): MatchingRun {
  const existingRuns = listMatchingRuns();
  const hasRun = existingRuns.some((r) => r.eventId === eventId && r.status === "completed");
  if (hasRun) {
    throw new Error("Matching already run for this event");
  }

  const matches: MatchResult[] = [];
  const now = new Date().toISOString();

  // Build MatchUser objects from event questionnaires
  const matchUsers: MatchUser[] = userIds.map((userId) => {
    const profile = getUserById(userId);
    const eventQ = eventQuestionnaires.get(userId);
    if (!profile || !eventQ) {
      throw new Error(`Missing profile or questionnaire for user ${userId}`);
    }

    return {
      id: profile.id,
      name: profile.name,
      city: profile.city,
      gender: profile.gender,
      answers: eventQ.answers,
    };
  });

  // Generate matches for each user
  const userMatchCounts = new Map<string, number>();
  const createdPairs = new Set<string>(); // Track created pairs to prevent duplicates

  for (const user of matchUsers) {
    const userMatches = getMatchesForUser(user, matchUsers, QUESTIONS);
    const userCount = userMatchCounts.get(user.id) || 0;

    // Filter by constraints
    const filteredMatches = userMatches
      .filter((match) => {
        const candidate = match.user;

        // Check historical exclusion
        const historical = getHistoricalMatches(user.id, candidate.id);
        if (historical.length > 0) return false;

        // Check orientation
        if (!matchesOrientation(user, candidate)) return false;

        // Check max matches per person
        const candidateCount = userMatchCounts.get(candidate.id) || 0;
        if (candidateCount >= MAX_MATCHES_PER_PERSON) return false;
        if (userCount >= MAX_MATCHES_PER_PERSON) return false;

        // Check if this pair already has a match (prevent duplicates)
        const pairKey = [user.id, candidate.id].sort().join("_");
        if (createdPairs.has(pairKey)) return false;

        return true;
      })
      .slice(0, MAX_MATCHES_PER_PERSON - userCount); // Cap at max

    // Create match results (only one per pair)
    for (const match of filteredMatches) {
      const candidate = match.user;
      const pairKey = [user.id, candidate.id].sort().join("_");
      
      // Mark this pair as created
      createdPairs.add(pairKey);

      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // Always use lexicographically smaller ID as userId1 to ensure consistency
      const [userId1, userId2] = [user.id, candidate.id].sort();
      const matchResult: MatchResult = {
        id: matchId,
        eventId,
        userId1,
        userId2,
        score: match.score,
        createdAt: now,
      };
      matches.push(matchResult);

      // Update counts
      userMatchCounts.set(user.id, (userMatchCounts.get(user.id) || 0) + 1);
      userMatchCounts.set(candidate.id, (userMatchCounts.get(candidate.id) || 0) + 1);
    }
  }

  // Save matches
  const allMatches = listMatchResults();
  allMatches.push(...matches);
  saveMatchResults(allMatches);

  // Create matching run record
  const run: MatchingRun = {
    id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventId,
    runAt: now,
    totalMatches: matches.length,
    status: "completed",
  };
  const runs = listMatchingRuns();
  runs.push(run);
  saveMatchingRuns(runs);

  return run;
}

/**
 * Record like/pass action on match
 */
export function recordMatchAction(
  eventId: string,
  matchId: string,
  userId: string,
  action: "like" | "pass"
): MatchActionRecord {
  const actions = listMatchActions();
  const existing = actions.find(
    (a) => a.eventId === eventId && a.matchId === matchId && a.userId === userId
  );

  if (existing) {
    existing.action = action;
    existing.createdAt = new Date().toISOString();
    saveMatchActions(actions);
    return existing;
  }

  const actionRecord: MatchActionRecord = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    eventId,
    matchId,
    userId,
    action,
    createdAt: new Date().toISOString(),
  };
  actions.push(actionRecord);
  saveMatchActions(actions);

  // Check for mutual like
  if (action === "like") {
    checkMutualLike(eventId, matchId, userId);
  }

  return actionRecord;
}

/**
 * Check if mutual like exists and create record
 */
function checkMutualLike(eventId: string, matchId: string, userId: string): void {
  const match = listMatchResults().find((m) => m.id === matchId);
  if (!match) return;

  const otherUserId = match.userId1 === userId ? match.userId2 : match.userId1;
  const actions = listMatchActions();

  const userAction = actions.find(
    (a) => a.eventId === eventId && a.matchId === matchId && a.userId === userId && a.action === "like"
  );
  const otherAction = actions.find(
    (a) => a.eventId === eventId && a.matchId === matchId && a.userId === otherUserId && a.action === "like"
  );

  if (userAction && otherAction) {
    // Mutual like!
    const mutualLikes = listMutualLikes();
    const exists = mutualLikes.some(
      (ml) =>
        ml.eventId === eventId &&
        ((ml.userId1 === userId && ml.userId2 === otherUserId) ||
          (ml.userId1 === otherUserId && ml.userId2 === userId))
    );

    if (!exists) {
      const mutualLike: MutualLike = {
        id: `mutual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventId,
        userId1: userId < otherUserId ? userId : otherUserId,
        userId2: userId < otherUserId ? otherUserId : userId,
        matchId,
        createdAt: new Date().toISOString(),
      };
      mutualLikes.push(mutualLike);
      saveMutualLikes(mutualLikes);
    }
  }
}

/**
 * Check if mutual like exists between two users for event
 */
export function hasMutualLike(
  eventId: string,
  userId1: string,
  userId2: string
): boolean {
  const mutualLikes = listMutualLikes();
  return mutualLikes.some(
    (ml) =>
      ml.eventId === eventId &&
      ((ml.userId1 === userId1 && ml.userId2 === userId2) ||
        (ml.userId1 === userId2 && ml.userId2 === userId1))
  );
}

/**
 * Get user's action on match
 */
export function getUserMatchAction(
  eventId: string,
  matchId: string,
  userId: string
): "like" | "pass" | null {
  const actions = listMatchActions();
  const action = actions.find(
    (a) => a.eventId === eventId && a.matchId === matchId && a.userId === userId
  );
  return action?.action || null;
}
