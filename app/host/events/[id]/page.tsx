"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getRole, getCurrentUserId } from "@/lib/demo/authStore";
import { getUserById } from "@/lib/demo/userStore";
import { getEventById } from "@/lib/demo/eventStore";
import { getRegistrationsForEvent, setAttendanceStatus } from "@/lib/demo/registrationStore";
import { checkInUser, markUserMissing } from "@/lib/demo/checkInStore";
import { Event } from "@/types/event";
import { EventRegistration } from "@/types/registration";

export default function HostEventManagePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [hostCity, setHostCity] = useState<string | null>(null);

  useEffect(() => {
    const role = getRole();
    if (role !== "host" && role !== "admin") {
      router.push("/events");
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      router.push("/host");
      return;
    }

    const user = getUserById(userId);
    if (!user) {
      router.push("/host");
      return;
    }

    const userCity = user.city;
    setHostCity(userCity);

    const eventData = getEventById(eventId);
    if (!eventData) {
      router.push("/host");
      return;
    }

    // Check if host can manage this event (must be in their city)
    // Only check if we have both city values and role is host (admin can manage any city)
    if (role === "host" && userCity && eventData.city && eventData.city !== userCity) {
      alert("You can only manage events in your city.");
      router.push("/host");
      return;
    }

    setEvent(eventData);
    loadRegistrations();
  }, [eventId, router]);

  const loadRegistrations = () => {
    const regs = getRegistrationsForEvent(eventId);
    // Only show confirmed registrations
    const confirmed = regs.filter((r) => r.rsvpStatus === "confirmed");
    setRegistrations(confirmed);
  };

  const handleCheckIn = (userId: string) => {
    checkInUser(eventId, userId);
    loadRegistrations();
  };

  const handleMarkMissing = (userId: string) => {
    markUserMissing(eventId, userId);
    loadRegistrations();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <p className="text-gray-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="mb-6">
        <Link
          href="/host"
          className="text-gray-medium hover:text-gray-dark text-sm mb-4 inline-block"
        >
          ← Back to Host Dashboard
        </Link>
        <h1 data-testid="host-event-title" className="text-3xl font-bold text-gray-dark mb-2">
          {event.title}
        </h1>
        <p className="text-gray-medium">
          {event.city} • {formatDate(event.datetime)}
        </p>
      </div>

      <div className="bg-white border border-beige-frame rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-dark mb-4">
          Attendees ({registrations.length})
        </h2>
        {registrations.length === 0 ? (
          <p className="text-gray-medium">No confirmed attendees yet.</p>
        ) : (
          <div className="space-y-2">
            {registrations.map((reg) => {
              const user = getUserById(reg.userId);
              const isCheckedIn = reg.attendanceStatus === "checked_in";
              const isMissing = reg.attendanceStatus === "missing";

              return (
                <div
                  key={reg.id}
                  className="flex justify-between items-center py-3 px-4 border border-beige-frame rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-dark">
                      {user?.name || reg.userId}
                    </div>
                    <div className="text-xs text-gray-medium">
                      {user?.email}
                    </div>
                    {isCheckedIn && (
                      <span className="text-xs text-green-600 mt-1 inline-block">
                        ✓ Checked In
                      </span>
                    )}
                    {isMissing && (
                      <span className="text-xs text-red-600 mt-1 inline-block">
                        ✗ Missing
                      </span>
                    )}
                    {!isCheckedIn && !isMissing && (
                      <span className="text-xs text-gray-medium mt-1 inline-block">
                        Not checked in
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!isCheckedIn && !isMissing && (
                      <>
                        <button
                          data-testid={`host-checkin-${eventId}-${reg.userId}`}
                          onClick={() => handleCheckIn(reg.userId)}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                        >
                          Check In
                        </button>
                        <button
                          data-testid={`host-missing-${eventId}-${reg.userId}`}
                          onClick={() => handleMarkMissing(reg.userId)}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                        >
                          Mark Missing
                        </button>
                      </>
                    )}
                    {isCheckedIn && (
                      <span className="px-3 py-1.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                        Checked In
                      </span>
                    )}
                    {isMissing && (
                      <span className="px-3 py-1.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                        Missing
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
