"use client";

import { Event } from "@/types/event";

const EVENTS_KEY = "ns_events";

/**
 * Get all events
 */
export function listEvents(): Event[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(EVENTS_KEY);
  if (!stored) {
    // Seed demo events on first access
    const seeded = seedDemoEvents();
    saveEvents(seeded);
    return seeded;
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
 * Get event by ID
 */
export function getEventById(id: string): Event | null {
  const events = listEvents();
  return events.find((e) => e.id === id) || null;
}

/**
 * Create event
 */
export function createEvent(event: Omit<Event, "id" | "createdAt">): Event {
  const events = listEvents();
  const newEvent: Event = {
    ...event,
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  events.push(newEvent);
  saveEvents(events);
  return newEvent;
}

/**
 * Update event
 */
export function updateEvent(
  eventId: string,
  patch: Partial<Omit<Event, "id" | "createdAt">>
): Event | null {
  const events = listEvents();
  const event = events.find((e) => e.id === eventId);
  if (!event) return null;

  Object.assign(event, patch);
  saveEvents(events);
  return event;
}

/**
 * Delete event
 */
export function deleteEvent(eventId: string): boolean {
  const events = listEvents();
  const index = events.findIndex((e) => e.id === eventId);
  if (index === -1) return false;

  events.splice(index, 1);
  saveEvents(events);
  return true;
}

/**
 * Save events to localStorage
 */
function saveEvents(events: Event[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

/**
 * Seed demo events
 */
function seedDemoEvents(): Event[] {
  const now = new Date().toISOString();
  const adminId = "admin_1"; // Default admin ID

  const coffeeStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const runningStart = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const techStart = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);

  return [
    {
      id: "event_coffee",
      title: "Coffee & Conversation",
      city: "Singapore",
      datetime: coffeeStart.toISOString(),
      endTime: new Date(coffeeStart.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
      description: "A casual meetup for meaningful conversations",
      capacity: 20,
      questionnaireTemplate: {
        questionIds: [
          "q_lifestyle_1",
          "q_lifestyle_2",
          "q_social_1",
          "q_social_4",
          "q_values_2",
        ],
        weights: {
          q_values_2: 3,
          q_social_4: 2,
        },
        dealbreakers: ["q_values_2"],
      },
      requiresApproval: true,
      requiresPayment: true,
      createdByAdminId: adminId,
      createdAt: now,
    },
    {
      id: "event_running",
      title: "Running Club Meetup",
      city: "Hong Kong",
      datetime: runningStart.toISOString(),
      endTime: new Date(runningStart.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      description: "Join us for a morning run followed by brunch",
      capacity: 15,
      questionnaireTemplate: {
        questionIds: [
          "q_lifestyle_3",
          "q_lifestyle_4",
          "q_social_1",
          "q_values_2",
        ],
        weights: {
          q_lifestyle_3: 2,
        },
      },
      requiresApproval: true,
      requiresPayment: false,
      createdByAdminId: adminId,
      createdAt: now,
    },
    {
      id: "event_tech",
      title: "Tech Networking Night",
      city: "Bangkok",
      datetime: techStart.toISOString(),
      endTime: new Date(techStart.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      description: "Network with fellow tech professionals",
      capacity: 30,
      questionnaireTemplate: {
        questionIds: [
          "q_lifestyle_1",
          "q_social_4",
          "q_values_2",
          "q_comm_2",
        ],
        weights: {
          q_social_4: 2,
        },
      },
      requiresApproval: true,
      requiresPayment: true,
      createdByAdminId: adminId,
      createdAt: now,
    },
  ];
}

