"use client";

/**
 * Centralized demo data initialization
 * Call this ONCE on app load to ensure all data is properly seeded
 * This prevents conflicts from multiple auto-seed functions
 */

import { UserProfile } from "@/types/user";
import { EventRegistration } from "@/types/registration";
import { EventQuestionnaireAnswers } from "@/types/questionnaire-event";
import { CheckIn } from "@/types/registration";
import { MatchResult, MutualLike, MatchActionRecord } from "@/types/matching";
import { QuestionnaireAnswers } from "@/types/questionnaire";

const INIT_FLAG_KEY = "ns_demo_initialized_v2";

export function initializeDemoData(): void {
  if (typeof window === "undefined") return;

  // Check if already initialized
  const initialized = localStorage.getItem(INIT_FLAG_KEY);
  if (initialized === "true") {
    return; // Already initialized, skip
  }

  console.log("🌱 Initializing demo data...");

  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const futureHold = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Base questionnaire answers
  const baseAnswers: QuestionnaireAnswers = {
    q_lifestyle_1: 3,
    q_lifestyle_2: 2,
    q_lifestyle_3: 4,
    q_lifestyle_4: 4,
    q_lifestyle_5: 2,
    q_social_1: 3,
    q_social_2: 3,
    q_social_3: 3,
    q_social_4: 4,
    q_values_1: 4,
    q_values_2: 4,
    q_values_3: 4,
    q_values_4: 3,
    q_comm_1: 2,
    q_comm_2: 4,
    q_comm_3: 4,
  };

  // ===== USERS =====
  const users: UserProfile[] = [
    {
      id: "anna",
      name: "Anna",
      email: "anna@example.com",
      city: "Singapore",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_1: 4, q_lifestyle_2: 1 },
      status: "approved",
      emailVerified: true,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
      role: "user",
    },
    {
      id: "alex",
      name: "Alex",
      email: "alex@example.com",
      city: "Singapore",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_3: 3, q_social_1: 4 },
      status: "approved",
      emailVerified: true,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date", "friends"] },
      role: "user",
    },
    {
      id: "daniel",
      name: "Daniel",
      email: "daniel@example.com",
      city: "Singapore",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_values_1: 3, q_comm_2: 3 },
      status: "approved",
      emailVerified: true,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
      role: "user",
    },
    {
      id: "david",
      name: "David",
      email: "david@example.com",
      city: "Singapore",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_2: 3, q_social_4: 3 },
      status: "approved",
      emailVerified: true,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date"] },
      role: "user",
    },
    {
      id: "chris",
      name: "Chris",
      email: "chris@example.com",
      city: "Hong Kong",
      cityLocked: true,
      questionnaireAnswers: baseAnswers,
      status: "approved",
      emailVerified: true,
      createdAt: oneHourAgo,
      approvedAt: oneHourAgo,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date"] },
      role: "user",
    },
    {
      id: "ethan",
      name: "Ethan",
      email: "ethan@example.com",
      city: "Hong Kong",
      cityLocked: false,
      questionnaireAnswers: baseAnswers,
      status: "rejected",
      emailVerified: true,
      createdAt: twoDaysAgo,
      rejectedAt: twoDaysAgo,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
      role: "user",
    },
    {
      id: "isabella",
      name: "Isabella",
      email: "isabella@example.com",
      city: "Bangkok",
      cityLocked: false,
      questionnaireAnswers: baseAnswers,
      status: "rejected",
      emailVerified: true,
      createdAt: oneHourAgo,
      rejectedAt: oneHourAgo,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
      role: "user",
    },
    {
      id: "ava",
      name: "Ava",
      email: "ava@example.com",
      city: "Tokyo",
      cityLocked: false,
      questionnaireAnswers: {},
      status: "unverified",
      emailVerified: false,
      createdAt: tenMinutesAgo,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
      role: "user",
    },
    {
      id: "emma",
      name: "Emma",
      email: "emma@example.com",
      city: "Tokyo",
      cityLocked: true,
      cityChangeRequested: "Singapore",
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_4: 3 },
      status: "approved",
      emailVerified: true,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
      role: "user",
    },
    {
      id: "james",
      name: "James",
      email: "james@example.com",
      city: "Hong Kong",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_2: 4, q_lifestyle_5: 4 },
      status: "approved",
      emailVerified: true,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
      role: "user",
    },
    {
      id: "sarah",
      name: "Sarah",
      email: "sarah@example.com",
      city: "Hong Kong",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_1: 3, q_social_2: 4, q_values_1: 3 },
      status: "approved",
      emailVerified: true,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["friends", "date"] },
      role: "user",
    },
    {
      id: "mike",
      name: "Mike",
      email: "mike@example.com",
      city: "Hong Kong",
      cityLocked: true,
      questionnaireAnswers: { ...baseAnswers, q_lifestyle_3: 2, q_social_1: 4, q_values_2: 3 },
      status: "approved",
      emailVerified: true,
      createdAt: twoDaysAgo,
      approvedAt: yesterday,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date"] },
      role: "user",
    },
  ];

  // ===== RSVPs =====
  const rsvps: EventRegistration[] = [
    // Coffee event (Singapore)
    {
      id: "rsvp_anna_coffee",
      eventId: "event_coffee",
      userId: "anna",
      rsvpStatus: "confirmed",
      paymentStatus: "paid",
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: "rsvp_alex_coffee",
      eventId: "event_coffee",
      userId: "alex",
      rsvpStatus: "hold",
      paymentStatus: "unpaid",
      holdExpiresAt: futureHold,
      createdAt: tenMinutesAgo,
      updatedAt: tenMinutesAgo,
    },
    {
      id: "rsvp_daniel_coffee",
      eventId: "event_coffee",
      userId: "daniel",
      rsvpStatus: "waitlisted",
      paymentStatus: "unpaid",
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
    // Running event (Hong Kong)
    {
      id: "rsvp_james_running",
      eventId: "event_running",
      userId: "james",
      rsvpStatus: "confirmed",
      paymentStatus: "paid",
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: "rsvp_sarah_running",
      eventId: "event_running",
      userId: "sarah",
      rsvpStatus: "confirmed",
      paymentStatus: "paid",
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: "rsvp_mike_running",
      eventId: "event_running",
      userId: "mike",
      rsvpStatus: "confirmed",
      paymentStatus: "paid",
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: "rsvp_chris_running",
      eventId: "event_running",
      userId: "chris",
      rsvpStatus: "hold",
      paymentStatus: "unpaid",
      holdExpiresAt: futureHold,
      createdAt: tenMinutesAgo,
      updatedAt: tenMinutesAgo,
    },
  ];

  // ===== EVENT QUESTIONNAIRES =====
  const eventQuestionnaires: EventQuestionnaireAnswers[] = [
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
    {
      id: "q_sarah_running",
      eventId: "event_running",
      userId: "sarah",
      answers: {
        q_lifestyle_1: 3,
        q_lifestyle_2: 2,
        q_lifestyle_3: 4,
        q_lifestyle_4: 4,
        q_lifestyle_5: 2,
        q_social_1: 3,
        q_social_2: 4,
        q_social_3: 3,
        q_social_4: 4,
        q_values_1: 3,
        q_values_2: 4,
        q_values_3: 4,
      },
      questionnaireVersion: "1.0",
      completed: true,
      locked: true,
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: "q_mike_running",
      eventId: "event_running",
      userId: "mike",
      answers: {
        q_lifestyle_1: 4,
        q_lifestyle_2: 3,
        q_lifestyle_3: 2,
        q_lifestyle_4: 3,
        q_lifestyle_5: 3,
        q_social_1: 4,
        q_social_2: 3,
        q_social_3: 4,
        q_social_4: 3,
        q_values_1: 4,
        q_values_2: 3,
        q_values_3: 3,
      },
      questionnaireVersion: "1.0",
      completed: true,
      locked: true,
      createdAt: yesterday,
      updatedAt: yesterday,
    },
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
      locked: false,
      createdAt: tenMinutesAgo,
      updatedAt: tenMinutesAgo,
    },
  ];

  // ===== CHECK-INS =====
  const checkIns: CheckIn[] = [
    {
      id: "checkin_anna_coffee",
      eventId: "event_coffee",
      userId: "anna",
      status: "checked_in",
      checkedInAt: oneHourAgo,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
    // Hong Kong event - all 3 checked in for matching
    {
      id: "checkin_james_running",
      eventId: "event_running",
      userId: "james",
      status: "checked_in",
      checkedInAt: oneHourAgo,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
    {
      id: "checkin_sarah_running",
      eventId: "event_running",
      userId: "sarah",
      status: "checked_in",
      checkedInAt: oneHourAgo,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
    {
      id: "checkin_mike_running",
      eventId: "event_running",
      userId: "mike",
      status: "checked_in",
      checkedInAt: oneHourAgo,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
  ];

  // ===== MATCHES =====
  const matches: MatchResult[] = [
    {
      id: "match_anna_alex",
      eventId: "event_coffee",
      userId1: "anna",
      userId2: "alex",
      score: 85,
      createdAt: oneHourAgo,
    },
  ];

  // ===== MATCH ACTIONS =====
  const matchActions: MatchActionRecord[] = [
    {
      id: "action_anna_alex",
      eventId: "event_coffee",
      matchId: "match_anna_alex",
      userId: "anna",
      action: "like",
      createdAt: tenMinutesAgo,
    },
    {
      id: "action_alex_anna",
      eventId: "event_coffee",
      matchId: "match_anna_alex",
      userId: "alex",
      action: "like",
      createdAt: tenMinutesAgo,
    },
  ];

  // ===== MUTUAL LIKES =====
  const mutualLikes: MutualLike[] = [
    {
      id: "mutual_anna_alex",
      eventId: "event_coffee",
      userId1: "anna",
      userId2: "alex",
      matchId: "match_anna_alex",
      createdAt: tenMinutesAgo,
    },
  ];

  // Save all data (users come from Supabase only, after POST /api/demo/seed)
  try {
    localStorage.setItem("ns_registrations", JSON.stringify(rsvps));
    localStorage.setItem("ns_questionnaire_events", JSON.stringify(eventQuestionnaires));
    localStorage.setItem("ns_checkins", JSON.stringify(checkIns));
    localStorage.setItem("ns_matches", JSON.stringify(matches));
    localStorage.setItem("ns_match_actions", JSON.stringify(matchActions));
    localStorage.setItem("ns_mutual_likes", JSON.stringify(mutualLikes));
    
    // Mark as initialized
    localStorage.setItem(INIT_FLAG_KEY, "true");
    
    console.log("✅ Demo data initialized successfully");
  } catch (err) {
    console.error("❌ Failed to initialize demo data:", err);
  }
}

/**
 * Reset all demo data
 */
export function resetDemoData(): void {
  if (typeof window === "undefined") return;
  
  const keys = [
    "ns_users",
    "ns_registrations",
    "ns_questionnaire_events",
    "ns_checkins",
    "ns_matches",
    "ns_matching_runs",
    "ns_match_actions",
    "ns_mutual_likes",
    "ns_notifications",
    "ns_events", // Keep events, they're managed separately
    INIT_FLAG_KEY,
  ];

  keys.forEach((key) => localStorage.removeItem(key));
  console.log("🗑️ Demo data reset");
}
