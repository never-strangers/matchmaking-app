"use client";

import { EventRegistration, RSVPStatus, PaymentStatus } from "@/types/registration";
import { Event } from "@/types/event";
import { getEventById } from "./eventStore";

const REGISTRATIONS_KEY = "ns_registrations";

// Hold expiry time: 10 minutes
const HOLD_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Get all registrations
 */
export function listRegistrations(): EventRegistration[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(REGISTRATIONS_KEY);
  if (!stored) {
    // Try central init first
    try {
      const { initializeDemoData } = require("./initDemoData");
      initializeDemoData();
      const retry = localStorage.getItem(REGISTRATIONS_KEY);
      if (retry) {
        return JSON.parse(retry);
      }
    } catch {
      // Fallback
      seedRegistrations();
      return listRegistrations();
    }
  }
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Seed demo RSVPs
 */
function seedRegistrations(): void {
  if (typeof window === "undefined") return;
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const futureHold = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min from now

  const rsvps: EventRegistration[] = [
    // Coffee event (capacity: 20)
    // Anna: Confirmed + Checked in
    {
      id: "rsvp_anna_coffee",
      eventId: "event_coffee",
      userId: "anna",
      rsvpStatus: "confirmed",
      paymentStatus: "paid",
      attendanceStatus: "checked_in",
      questionnaireCompleted: true,
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    // Alex: Hold (active, not expired) - will become confirmed after payment
    {
      id: "rsvp_alex_coffee",
      eventId: "event_coffee",
      userId: "alex",
      rsvpStatus: "hold",
      paymentStatus: "unpaid",
      holdExpiresAt: futureHold,
      attendanceStatus: "none",
      questionnaireCompleted: false,
      createdAt: tenMinutesAgo,
      updatedAt: tenMinutesAgo,
    },
    // Daniel: Waitlisted (capacity will be full after Alex pays)
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
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    // Running event (Hong Kong, capacity: 15)
    // James: Confirmed but not checked in
    {
      id: "rsvp_james_running",
      eventId: "event_running",
      userId: "james",
      rsvpStatus: "confirmed",
      paymentStatus: "paid",
      attendanceStatus: "none",
      questionnaireCompleted: true,
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    // Chris: Hold (needs payment) - will be visible after admin approves
    {
      id: "rsvp_chris_running",
      eventId: "event_running",
      userId: "chris",
      rsvpStatus: "hold",
      paymentStatus: "unpaid",
      holdExpiresAt: futureHold,
      attendanceStatus: "none",
      questionnaireCompleted: false,
      createdAt: tenMinutesAgo,
      updatedAt: tenMinutesAgo,
    },
    // Tech event (Bangkok, capacity: 30)
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

  localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(rsvps));
}

/**
 * Get registration by event and user
 */
export function getRegistration(
  eventId: string,
  userId: string
): EventRegistration | null {
  const registrations = listRegistrations();
  return (
    registrations.find(
      (r) => r.eventId === eventId && r.userId === userId
    ) || null
  );
}

/**
 * Get registrations for an event
 */
export function getRegistrationsForEvent(
  eventId: string
): EventRegistration[] {
  const registrations = listRegistrations();
  return registrations.filter((r) => r.eventId === eventId);
}

/**
 * Get registrations for a user
 */
export function getRegistrationsForUser(
  userId: string
): EventRegistration[] {
  const registrations = listRegistrations();
  return registrations.filter((r) => r.userId === userId);
}

/**
 * Save registrations to localStorage
 */
function saveRegistrations(registrations: EventRegistration[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(registrations));
}

/**
 * Clean up expired holds
 */
function cleanupExpiredHolds(): void {
  const registrations = listRegistrations();
  const now = Date.now();
  let changed = false;

  registrations.forEach((reg) => {
    if (reg.rsvpStatus === "hold" && reg.holdExpiresAt) {
      const expiresAt = new Date(reg.holdExpiresAt).getTime();
      if (now >= expiresAt) {
        reg.rsvpStatus = "none";
        reg.holdExpiresAt = undefined;
        reg.updatedAt = new Date().toISOString();
        changed = true;
      }
    }
  });

  if (changed) {
    saveRegistrations(registrations);
  }
}

/**
 * Get confirmed count for event
 */
function getConfirmedCount(eventId: string): number {
  const registrations = listRegistrations();
  return registrations.filter(
    (r) => r.eventId === eventId && r.rsvpStatus === "confirmed"
  ).length;
}

/**
 * Get waitlisted count for event
 */
function getWaitlistedCount(eventId: string): number {
  const registrations = listRegistrations();
  return registrations.filter(
    (r) => r.eventId === eventId && r.rsvpStatus === "waitlisted"
  ).length;
}

/**
 * Check if events overlap
 */
function eventsOverlap(event1: Event, event2: Event): boolean {
  const start1 = new Date(event1.datetime).getTime();
  const end1 = event1.endTime
    ? new Date(event1.endTime).getTime()
    : start1 + 3 * 60 * 60 * 1000; // Default 3 hours

  const start2 = new Date(event2.datetime).getTime();
  const end2 = event2.endTime
    ? new Date(event2.endTime).getTime()
    : start2 + 3 * 60 * 60 * 1000;

  // Overlap if: start1 < end2 && start2 < end1
  return start1 < end2 && start2 < end1;
}

/**
 * Check if user has overlapping confirmed RSVP
 */
function hasOverlappingRSVP(
  userId: string,
  eventId: string,
  newEvent: Event
): boolean {
  const userRegs = getRegistrationsForUser(userId);
  const confirmedRegs = userRegs.filter((r) => r.rsvpStatus === "confirmed");

  for (const reg of confirmedRegs) {
    if (reg.eventId === eventId) continue; // Same event, skip
    const existingEvent = getEventById(reg.eventId);
    if (existingEvent && eventsOverlap(existingEvent, newEvent)) {
      return true;
    }
  }

  return false;
}

/**
 * Promote waitlist to hold (FIFO)
 */
function promoteWaitlistToHold(eventId: string): EventRegistration | null {
  const registrations = listRegistrations();
  const waitlisted = registrations
    .filter((r) => r.eventId === eventId && r.rsvpStatus === "waitlisted")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (waitlisted.length === 0) return null;

  const promoted = waitlisted[0];
  promoted.rsvpStatus = "hold";
  promoted.holdExpiresAt = new Date(Date.now() + HOLD_EXPIRY_MS).toISOString();
  promoted.updatedAt = new Date().toISOString();
  saveRegistrations(registrations);
  return promoted;
}

/**
 * Request RSVP (creates HOLD or WAITLIST)
 */
export function requestRSVP(
  eventId: string,
  userId: string
): { registration: EventRegistration; status: "hold" | "waitlisted" | "overlap" | "error" } {
  cleanupExpiredHolds();

  const event = getEventById(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  // Check for overlapping RSVP
  if (hasOverlappingRSVP(userId, eventId, event)) {
    const existing = getRegistration(eventId, userId);
    return {
      registration: existing || {
        id: "",
        eventId,
        userId,
        rsvpStatus: "none",
        paymentStatus: "unpaid",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      status: "overlap",
    };
  }

  const existing = getRegistration(eventId, userId);
  if (existing && existing.rsvpStatus !== "none") {
    return { registration: existing, status: existing.rsvpStatus === "hold" ? "hold" : "waitlisted" };
  }

  const registrations = listRegistrations();
  const confirmedCount = getConfirmedCount(eventId);
  const capacity = event.capacity || Infinity;

  const now = new Date().toISOString();
  let registration: EventRegistration;

  if (confirmedCount < capacity) {
    // Create HOLD
    registration = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventId,
      userId,
      rsvpStatus: "hold",
      paymentStatus: "unpaid",
      holdExpiresAt: new Date(Date.now() + HOLD_EXPIRY_MS).toISOString(),
      attendanceStatus: "none",
      questionnaireCompleted: false,
      createdAt: now,
      updatedAt: now,
    };
    registrations.push(registration);
    saveRegistrations(registrations);
    return { registration, status: "hold" };
  } else {
    // Add to waitlist
    registration = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventId,
      userId,
      rsvpStatus: "waitlisted",
      paymentStatus: "unpaid",
      attendanceStatus: "none",
      questionnaireCompleted: false,
      createdAt: now,
      updatedAt: now,
    };
    registrations.push(registration);
    saveRegistrations(registrations);
    return { registration, status: "waitlisted" };
  }
}

/**
 * Complete payment and confirm RSVP
 */
export function confirmRSVP(
  regId: string
): EventRegistration | null {
  cleanupExpiredHolds();

  const registrations = listRegistrations();
  const registration = registrations.find((r) => r.id === regId);
  if (!registration) return null;

  if (registration.rsvpStatus !== "hold") {
    throw new Error("RSVP must be in HOLD status to confirm");
  }

  // Check if hold expired
  if (registration.holdExpiresAt) {
    const expiresAt = new Date(registration.holdExpiresAt).getTime();
    if (Date.now() >= expiresAt) {
      registration.rsvpStatus = "none";
      registration.holdExpiresAt = undefined;
      registration.updatedAt = new Date().toISOString();
      saveRegistrations(registrations);
      throw new Error("Hold expired. Please try again.");
    }
  }

  // Check capacity again (might have changed)
  const event = getEventById(registration.eventId);
  if (!event) return null;

  const confirmedCount = getConfirmedCount(registration.eventId);
  const capacity = event.capacity || Infinity;

  if (confirmedCount >= capacity) {
    // Shouldn't happen if hold was valid, but handle gracefully
    registration.rsvpStatus = "waitlisted";
    registration.holdExpiresAt = undefined;
    registration.updatedAt = new Date().toISOString();
    saveRegistrations(registrations);
    return registration;
  }

  // Confirm RSVP
  registration.rsvpStatus = "confirmed";
  registration.paymentStatus = "paid";
  registration.holdExpiresAt = undefined;
  registration.attendanceStatus = registration.attendanceStatus || "none";
  // questionnaireCompleted will be set when user completes questionnaire
  registration.updatedAt = new Date().toISOString();
  saveRegistrations(registrations);

  // Promote waitlist if capacity allows
  promoteWaitlistToHold(registration.eventId);

  return registration;
}

/**
 * Cancel RSVP
 */
export function cancelRSVP(
  eventId: string,
  userId: string
): EventRegistration | null {
  cleanupExpiredHolds();

  const registrations = listRegistrations();
  const registration = registrations.find(
    (r) => r.eventId === eventId && r.userId === userId
  );
  if (!registration) return null;

  const wasConfirmed = registration.rsvpStatus === "confirmed";
  registration.rsvpStatus = "cancelled";
  registration.updatedAt = new Date().toISOString();
  saveRegistrations(registrations);

  // If was confirmed, promote waitlist
  if (wasConfirmed) {
    promoteWaitlistToHold(eventId);
  }

  return registration;
}

/**
 * Get available capacity for event
 */
export function getAvailableCapacity(eventId: string): number {
  cleanupExpiredHolds();
  const event = getEventById(eventId);
  if (!event || !event.capacity) return Infinity;
  const confirmedCount = getConfirmedCount(eventId);
  return Math.max(0, event.capacity - confirmedCount);
}

/**
 * Check if user can RSVP (no overlap, not already confirmed)
 */
export function canRSVP(eventId: string, userId: string): { can: boolean; reason?: string } {
  cleanupExpiredHolds();

  const event = getEventById(eventId);
  if (!event) return { can: false, reason: "Event not found" };

  const existing = getRegistration(eventId, userId);
  if (existing && existing.rsvpStatus === "confirmed") {
    return { can: false, reason: "Already confirmed" };
  }

  if (hasOverlappingRSVP(userId, eventId, event)) {
    return { can: false, reason: "Overlaps with another confirmed RSVP" };
  }

  return { can: true };
}

// Legacy compatibility functions
export function requestRegistration(eventId: string, userId: string): EventRegistration {
  const result = requestRSVP(eventId, userId);
  return result.registration;
}

export function setRegistrationStatus(
  regId: string,
  status: "requested" | "approved" | "rejected"
): EventRegistration | null {
  // Legacy function - map to new RSVP status
  const registrations = listRegistrations();
  const registration = registrations.find((r) => r.id === regId);
  if (!registration) return null;

  if (status === "approved") {
    registration.rsvpStatus = "confirmed";
  } else if (status === "rejected") {
    registration.rsvpStatus = "cancelled";
  }
  registration.updatedAt = new Date().toISOString();
  saveRegistrations(registrations);
  return registration;
}

export function setPaymentStatus(
  regId: string,
  paymentStatus: PaymentStatus
): EventRegistration | null {
  const registrations = listRegistrations();
  const registration = registrations.find((r) => r.id === regId);
  if (!registration) return null;

  registration.paymentStatus = paymentStatus;
  if (paymentStatus === "paid" && registration.rsvpStatus === "hold") {
    return confirmRSVP(regId);
  }
  registration.updatedAt = new Date().toISOString();
  saveRegistrations(registrations);
  return registration;
}

/**
 * Set attendance status for a registration
 */
export function setAttendanceStatus(
  eventId: string,
  userId: string,
  status: "checked_in" | "missing" | "none"
): EventRegistration | null {
  const registrations = listRegistrations();
  const registration = registrations.find(
    (r) => r.eventId === eventId && r.userId === userId
  );
  if (!registration) return null;

  registration.attendanceStatus = status;
  registration.updatedAt = new Date().toISOString();
  saveRegistrations(registrations);
  return registration;
}

/**
 * Mark questionnaire as completed for a registration
 */
export function setQuestionnaireCompleted(
  eventId: string,
  userId: string,
  completed: boolean
): EventRegistration | null {
  const registrations = listRegistrations();
  const registration = registrations.find(
    (r) => r.eventId === eventId && r.userId === userId
  );
  if (!registration) return null;

  registration.questionnaireCompleted = completed;
  registration.updatedAt = new Date().toISOString();
  saveRegistrations(registrations);
  return registration;
}
