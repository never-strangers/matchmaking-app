"use client";

import { CheckIn, CheckInStatus } from "@/types/registration";

const CHECKINS_KEY = "ns_checkins";

/**
 * Get all check-ins
 */
function listCheckIns(): CheckIn[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(CHECKINS_KEY);
  if (!stored) {
    const initFlag = localStorage.getItem("ns_demo_initialized_v2");
    if (initFlag !== "true") {
      try {
        const { initializeDemoData } = require("./initDemoData");
        initializeDemoData();
        const retry = localStorage.getItem(CHECKINS_KEY);
        if (retry) {
          return JSON.parse(retry);
        }
      } catch {
        seedCheckIns();
        return listCheckIns();
      }
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
 * Seed demo check-ins
 */
function seedCheckIns(): void {
  if (typeof window === "undefined") return;
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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

  localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkIns));
}

/**
 * Save check-ins
 */
function saveCheckIns(checkIns: CheckIn[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkIns));
}

/**
 * Get check-in for user and event
 */
export function getCheckIn(eventId: string, userId: string): CheckIn | null {
  const checkIns = listCheckIns();
  return checkIns.find((c) => c.eventId === eventId && c.userId === userId) || null;
}

/**
 * Get all check-ins for event
 */
export function getCheckInsForEvent(eventId: string): CheckIn[] {
  const checkIns = listCheckIns();
  return checkIns.filter((c) => c.eventId === eventId);
}

/**
 * Get checked-in users for event
 */
export function getCheckedInUsers(eventId: string): string[] {
  const checkIns = getCheckInsForEvent(eventId);
  return checkIns
    .filter((c) => c.status === "checked_in")
    .map((c) => c.userId);
}

/**
 * Check in user for event
 */
export function checkInUser(eventId: string, userId: string): CheckIn {
  const checkIns = listCheckIns();
  const existing = checkIns.find((c) => c.eventId === eventId && c.userId === userId);

  const now = new Date().toISOString();

  if (existing) {
    existing.status = "checked_in";
    existing.checkedInAt = now;
    existing.updatedAt = now;
    saveCheckIns(checkIns);
    
    // Update registration attendanceStatus
    const { setAttendanceStatus } = require("./registrationStore");
    setAttendanceStatus(eventId, userId, "checked_in");
    
    return existing;
  } else {
    const checkIn: CheckIn = {
      id: `checkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventId,
      userId,
      status: "checked_in",
      checkedInAt: now,
      createdAt: now,
      updatedAt: now,
    };
    checkIns.push(checkIn);
    saveCheckIns(checkIns);
    
    // Update registration attendanceStatus
    const { setAttendanceStatus } = require("./registrationStore");
    setAttendanceStatus(eventId, userId, "checked_in");
    
    return checkIn;
  }
}

/**
 * Mark user as missing for event
 */
export function markUserMissing(eventId: string, userId: string): void {
  const { setAttendanceStatus } = require("./registrationStore");
  setAttendanceStatus(eventId, userId, "missing");
}

/**
 * Check if all confirmed attendees are checked in
 */
export function areAllAttendeesCheckedIn(
  eventId: string,
  confirmedUserIds: string[]
): boolean {
  if (confirmedUserIds.length === 0) return false;
  const checkedIn = getCheckedInUsers(eventId);
  return confirmedUserIds.every((id) => checkedIn.includes(id));
}
