"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { markEventJoined, isEventJoined, listEvents, type DemoEvent } from "@/lib/demoStore";

const defaultEvents: DemoEvent[] = [
  {
    id: "event-coffee",
    title: "Coffee & Conversation",
    city: "Singapore",
    date: "March 15, 2024",
  },
  {
    id: "event-running",
    title: "Running Club Meetup",
    city: "Hong Kong",
    date: "March 20, 2024",
  },
  {
    id: "event-tech",
    title: "Tech Networking Night",
    city: "Bangkok",
    date: "March 25, 2024",
  },
];

export default function EventsPage() {
  const [events, setEvents] = useState<DemoEvent[]>(defaultEvents);
  const [joinedEvents, setJoinedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load events from demo store
    const storedEvents = listEvents();
    if (storedEvents.length > 0) {
      // Merge with default events, avoiding duplicates
      const allEvents = [...storedEvents, ...defaultEvents];
      // Remove duplicates based on title
      const uniqueEvents = Array.from(
        new Map(allEvents.map((e) => [e.title, e])).values()
      );
      setEvents(uniqueEvents);
    }
    
    // Load joined events
    const joined = new Set<string>();
    defaultEvents.forEach((event) => {
      const eventId = event.id || `event-${defaultEvents.indexOf(event)}`;
      if (isEventJoined(eventId)) {
        joined.add(eventId);
      }
    });
    setJoinedEvents(joined);
  }, []);

  const handleJoin = (eventId: string) => {
    markEventJoined(eventId);
    setJoinedEvents((prev) => new Set([...prev, eventId]));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center mb-8">
        <h1 data-testid="events-title" className="text-3xl font-bold text-gray-dark">Events</h1>
        <Link
          href="/onboarding/setup"
          className="bg-red-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Create Event
        </Link>
      </div>
      {events.length === 0 ? (
      <p className="text-gray-medium mb-8">
        In the next version, you&apos;ll see curated community events here.
      </p>
      ) : (
      <div className="space-y-4">
          {events.map((event, index) => {
            const eventId = event.id || `event-${index}`;
            const joined = joinedEvents.has(eventId);
            return (
              <div
                key={index}
                data-testid={`event-card-${eventId}`}
                className="border border-beige-frame rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-dark mb-2">
                      {event.title}
                    </h2>
                    <p className="text-sm text-gray-medium">
                      {event.city} • {event.date}
                    </p>
                    {joined && (
                      <span
                        data-testid={`event-joined-${eventId}`}
                        className="inline-block mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                      >
                        ✓ Joined
                      </span>
                    )}
                  </div>
                  {!joined && (
                    <button
                      data-testid={`event-join-${eventId}`}
                      onClick={() => handleJoin(eventId)}
                      className="ml-4 bg-red-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
      )}
    </div>
  );
}


