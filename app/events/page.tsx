"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const defaultEvents = [
  {
    title: "Coffee & Conversation",
    city: "Singapore",
    date: "March 15, 2024",
  },
  {
    title: "Running Club Meetup",
    city: "Hong Kong",
    date: "March 20, 2024",
  },
  {
    title: "Tech Networking Night",
    city: "Bangkok",
    date: "March 25, 2024",
  },
];

export default function EventsPage() {
  const [events, setEvents] = useState(defaultEvents);

  useEffect(() => {
    // Load events from localStorage
    const storedEvents = localStorage.getItem("events");
    if (storedEvents) {
      const parsed = JSON.parse(storedEvents);
      // Merge with default events, avoiding duplicates
      const allEvents = [...parsed, ...defaultEvents];
      // Remove duplicates based on title
      const uniqueEvents = Array.from(
        new Map(allEvents.map((e) => [e.title, e])).values()
      );
      setEvents(uniqueEvents);
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-dark">Events</h1>
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
          {events.map((event, index) => (
          <div
            key={index}
              className="border border-beige-frame rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
          >
            <h2 className="text-lg font-semibold text-gray-dark mb-2">
              {event.title}
            </h2>
            <p className="text-sm text-gray-medium">
              {event.city} • {event.date}
            </p>
              {event.url && (
                <p className="text-xs text-gray-medium font-mono mt-2">
                  {event.url}
                </p>
              )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}


