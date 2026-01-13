"use client";

import { UserProfile } from "@/types/user";
import { EventRegistration } from "@/types/registration";
import { EventQuestionnaireAnswers } from "@/types/questionnaire-event";
import { CheckIn } from "@/types/registration";
import { MatchResult, MutualLike } from "@/types/matching";
import { QuestionnaireAnswers } from "@/types/questionnaire";
import { Event } from "@/types/event";

/**
 * Comprehensive demo data seeding
 * Covers all app states: user statuses, RSVPs, check-ins, matches, etc.
 */
export function seedAllDemoData() {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const futureHold = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min from now

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
    // Approved users (Singapore)
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
    // Pending approval
    {
      id: "chris",
      name: "Chris",
      email: "chris@example.com",
      city: "Hong Kong",
      cityLocked: false,
      questionnaireAnswers: baseAnswers,
      status: "pending_approval",
      emailVerified: true,
      createdAt: oneHourAgo,
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["date"] },
      role: "user",
    },
    // Rejected (cooldown expired)
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
      rejectedAt: twoDaysAgo, // Can reapply now
      gender: "male",
      orientation: { attractedTo: ["female"], lookingFor: ["friends"] },
      role: "user",
    },
    // Rejected (cooldown active)
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
      rejectedAt: oneHourAgo, // Still in cooldown
      gender: "female",
      orientation: { attractedTo: ["male"], lookingFor: ["date"] },
      role: "user",
    },
    // Unverified
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
    // Approved with city change request
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
    // Approved (Hong Kong)
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
  ];

  // ===== RSVPs =====
  const rsvps: EventRegistration[] = [
    // Anna: Confirmed + Checked in (Coffee event)
    {
      id: "rsvp_anna_coffee",
      eventId: "event_coffee",
      userId: "anna",
      rsvpStatus: "confirmed",
      paymentStatus: "paid",
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    // Alex: Hold (active, not expired)
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
    // Daniel: Waitlisted (capacity full)
    {
      id: "rsvp_daniel_coffee",
      eventId: "event_coffee",
      userId: "daniel",
      rsvpStatus: "waitlisted",
      paymentStatus: "unpaid",
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
    // David: Hold expired (should be cleaned up)
    {
      id: "rsvp_david_coffee",
      eventId: "event_coffee",
      userId: "david",
      rsvpStatus: "hold",
      paymentStatus: "unpaid",
      holdExpiresAt: tenMinutesAgo, // Expired
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    // James: Confirmed (Running event, Hong Kong)
    {
      id: "rsvp_james_running",
      eventId: "event_running",
      userId: "james",
      rsvpStatus: "confirmed",
      paymentStatus: "paid",
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    // Emma: Cancelled
    {
      id: "rsvp_emma_tech",
      eventId: "event_tech",
      userId: "emma",
      rsvpStatus: "cancelled",
      paymentStatus: "unpaid",
      createdAt: yesterday,
      updatedAt: oneHourAgo,
    },
  ];

  // ===== PER-EVENT QUESTIONNAIRES =====
  const eventQuestionnaires: EventQuestionnaireAnswers[] = [
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
      locked: true, // Locked because RSVP is confirmed
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
        // Only 5 answers - incomplete
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
  ];

  // ===== CHECK-INS =====
  const checkIns: CheckIn[] = [
    // Anna: Checked in (Coffee event)
    {
      id: "checkin_anna_coffee",
      eventId: "event_coffee",
      userId: "anna",
      status: "checked_in",
      checkedInAt: oneHourAgo,
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo,
    },
    // James: Not checked in (Running event)
    {
      id: "checkin_james_running",
      eventId: "event_running",
      userId: "james",
      status: "not_checked_in",
      createdAt: yesterday,
      updatedAt: yesterday,
    },
  ];

  // ===== MATCHES =====
  const matches: MatchResult[] = [
    // Anna matched with Alex (Coffee event) - already run
    {
      id: "match_anna_alex",
      eventId: "event_coffee",
      userId1: "anna",
      userId2: "alex",
      score: 85,
      createdAt: oneHourAgo,
    },
  ];

  // ===== MUTUAL LIKES =====
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

  return {
    users,
    rsvps,
    eventQuestionnaires,
    checkIns,
    matches,
    mutualLikes,
  };
}
