"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRole, getCurrentUserId } from "@/lib/demo/authStore";
import { getUserById } from "@/lib/demo/userStore";
import { listEvents } from "@/lib/demo/eventStore";
import { getRegistrationsForEvent } from "@/lib/demo/registrationStore";
import { Event } from "@/types/event";
import { useRouter } from "next/navigation";

export default function HostPage() {
  const router = useRouter();
  const [hostCity, setHostCity] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const role = getRole();
    if (role !== "host" && role !== "admin") {
      router.push("/events");
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      router.push("/events");
      return;
    }

    const user = getUserById(userId);
    if (!user) {
      router.push("/events");
      return;
    }

    const userCity = user.city;
    setHostCity(userCity);

    // Load events in host city
    const allEvents = listEvents();
    const cityEvents = role === "admin" 
      ? allEvents 
      : allEvents.filter((e) => e.city === userCity);
    setEvents(cityEvents);
  }, [router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center mb-8">
        <h1 data-testid="host-title" className="text-3xl font-bold text-gray-dark">
          Host Dashboard
        </h1>
        <Link
          href="/host/events/new"
          data-testid="host-create-event"
          className="bg-red-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Create Event
        </Link>
      </div>

      {hostCity && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            Managing events in <strong>{hostCity}</strong>
          </p>
        </div>
      )}

      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-gray-medium">
            No events in your city. Create your first event to get started.
          </p>
        ) : (
          events.map((event) => {
            const registrations = getRegistrationsForEvent(event.id);
            const confirmedRegs = registrations.filter((r) => r.rsvpStatus === "confirmed");
            
            return (
              <div
                key={event.id}
                data-testid={`host-event-row-${event.id}`}
                className="border border-beige-frame rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-dark mb-2">
                      {event.title}
                    </h2>
                    <p className="text-sm text-gray-medium mb-1">
                      {event.city} • {formatDate(event.datetime)}
                    </p>
                    <p className="text-xs text-gray-medium">
                      {confirmedRegs.length} confirmed attendees
                    </p>
                  </div>
                  <Link
                    href={`/host/events/${event.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
