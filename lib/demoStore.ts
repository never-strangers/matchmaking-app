"use client";

import { QuestionnaireAnswers } from "@/types/questionnaire";

const DEMO_PREFIX = "ns_demo_";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  city: string;
  interests: string[];
}

export interface DemoMatch {
  id: string;
  userId: string;
  userName: string;
  createdAt: string;
}

// Demo User
export function setDemoUser(user: DemoUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${DEMO_PREFIX}user`, JSON.stringify(user));
}

export function getDemoUser(): DemoUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(`${DEMO_PREFIX}user`);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Event Joining
export function markEventJoined(eventId: string): void {
  if (typeof window === "undefined") return;
  const joined = getJoinedEvents();
  if (!joined.includes(eventId)) {
    joined.push(eventId);
    localStorage.setItem(`${DEMO_PREFIX}joined_events`, JSON.stringify(joined));
  }
}

export function isEventJoined(eventId: string): boolean {
  const joined = getJoinedEvents();
  return joined.includes(eventId);
}

function getJoinedEvents(): string[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(`${DEMO_PREFIX}joined_events`);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Match Likes
export function markLiked(userId: string): void {
  if (typeof window === "undefined") return;
  const liked = getLikedUsers();
  if (!liked.includes(userId)) {
    liked.push(userId);
    localStorage.setItem(`${DEMO_PREFIX}liked_users`, JSON.stringify(liked));
  }
}

export function isLiked(userId: string): boolean {
  const liked = getLikedUsers();
  return liked.includes(userId);
}

function getLikedUsers(): string[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(`${DEMO_PREFIX}liked_users`);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Matches
export function createMatch(userId: string, userName: string): DemoMatch {
  if (typeof window === "undefined") {
    return { id: "", userId, userName, createdAt: new Date().toISOString() };
  }
  const match: DemoMatch = {
    id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    userName,
    createdAt: new Date().toISOString(),
  };
  const matches = listMatches();
  matches.push(match);
  localStorage.setItem(`${DEMO_PREFIX}matches`, JSON.stringify(matches));
  return match;
}

export function listMatches(): DemoMatch[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(`${DEMO_PREFIX}matches`);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function hasMatch(userId: string): boolean {
  const matches = listMatches();
  return matches.some((m) => m.userId === userId);
}

// Questionnaire Answers
export function setQuestionnaireAnswers(answers: QuestionnaireAnswers): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${DEMO_PREFIX}answers`, JSON.stringify(answers));
}

export function getQuestionnaireAnswers(): QuestionnaireAnswers | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(`${DEMO_PREFIX}answers`);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Skipped Users (for match page)
export function markSkipped(userId: string): void {
  if (typeof window === "undefined") return;
  const skipped = getSkippedUsers();
  if (!skipped.includes(userId)) {
    skipped.push(userId);
    localStorage.setItem(`${DEMO_PREFIX}skipped_users`, JSON.stringify(skipped));
  }
}

export function isSkipped(userId: string): boolean {
  const skipped = getSkippedUsers();
  return skipped.includes(userId);
}

function getSkippedUsers(): string[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(`${DEMO_PREFIX}skipped_users`);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Reset all demo data
export function resetDemoData(): void {
  if (typeof window === "undefined") return;
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(DEMO_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}




