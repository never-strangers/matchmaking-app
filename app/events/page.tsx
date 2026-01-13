"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { listEvents as getEvents } from "@/lib/demo/eventStore";
import { getCurrentUserId } from "@/lib/demo/authStore";
import { getUserById, isApproved } from "@/lib/demo/userStore";
import {
  requestRSVP,
  getRegistration,
  confirmRSVP,
  canRSVP,
  getAvailableCapacity,
} from "@/lib/demo/registrationStore";
import {
  isQuestionnaireComplete,
  getQuestionnaireAnswerCount,
} from "@/lib/demo/questionnaireEventStore";
import { Event } from "@/types/event";
import { isAdmin, isHost, getRole } from "@/lib/demo/authStore";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(null);
  const [userApproved, setUserApproved] = useState(false);
  const [userCity, setUserCity] = useState<string | null>(null);

  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserIdState(userId);

    if (userId) {
      const user = getUserById(userId);
      if (user) {
        setUserApproved(isApproved(userId));
        setUserCity(user.city);
      }
    }

    // Load events
    const allEvents = getEvents();
    setEvents(allEvents);
  }, []);

  // Filter events by city (approved users, hosts, and admins see their city)
  const filteredEvents = events.filter((event) => {
    const role = getRole();
    if (isAdmin()) return true; // Admins see all
    if (isHost()) {
      // Hosts see events in their city
      if (!userCity) return false;
      return event.city === userCity;
    }
    if (!userApproved) return false; // Pending users see none
    if (!userCity) return false;
    return event.city === userCity;
  });

  const handleRSVP = (eventId: string) => {
    if (!currentUserId) {
      alert("Please register first.");
      return;
    }

    const role = getRole();
    // Hosts and admins can RSVP without approval, regular users need approval
    if (role !== "host" && role !== "admin" && !userApproved) {
      alert("Your account is pending approval. Please wait for admin approval before RSVPing to events.");
      return;
    }

    // No questionnaire check before RSVP - questionnaire comes after payment
    try {
      const result = requestRSVP(eventId, currentUserId);
      if (result.status === "overlap") {
        alert("You already have a confirmed RSVP for an overlapping event.");
        return;
      }
      // Refresh to show updated status
      setEvents([...getEvents()]);
    } catch (err: any) {
      alert(err.message || "Failed to RSVP");
    }
  };

  const handlePay = async (regId: string, eventTitle: string) => {
    // Show mock payment modal
    const confirmed = window.confirm(
      `Mock Payment for "${eventTitle}"\n\n` +
      `Amount: $10.00\n` +
      `Payment Method: Demo Card (****1234)\n\n` +
      `Click OK to complete payment (demo mode)`
    );

    if (!confirmed) return;

    try {
      // Mock payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Confirm RSVP after payment
      confirmRSVP(regId);
      setEvents([...getEvents()]);
      alert("✅ Payment successful! Your RSVP is confirmed.");
    } catch (err: any) {
      alert(err.message || "Payment failed");
    }
  };

  const getRegistrationStatus = (eventId: string) => {
    if (!currentUserId) return null;
    return getRegistration(eventId, currentUserId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center mb-8">
        <h1 data-testid="events-title" className="text-3xl font-bold text-gray-dark">
          Events
        </h1>
        {isAdmin() && (
          <Link
            href="/events/new/setup"
            className="bg-red-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Create Event
          </Link>
        )}
      </div>

      {!currentUserId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            Please complete onboarding to view and RSVP to events.
          </p>
        </div>
      )}

      {currentUserId && !userApproved && (
        <div 
          data-testid="register-status-banner"
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
        >
          <p className="text-blue-800 text-sm">
            Pending admin approval. Once approved, you&apos;ll be able to RSVP to events.
          </p>
        </div>
      )}

      {userApproved && userCity && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-sm">
            Showing events in <strong>{userCity}</strong>
          </p>
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <p className="text-gray-medium mb-8">
          {userApproved
            ? "No events available in your city."
            : "No events available. " + (isAdmin() ? "Create your first event to get started." : "")}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const registration = getRegistrationStatus(event.id);
            const availableCapacity = getAvailableCapacity(event.id);
            const canRSVPToEvent = canRSVP(event.id, currentUserId || "").can;
            const questionnaireComplete = currentUserId
              ? isQuestionnaireComplete(event.id, currentUserId)
              : false;
            const answerCount = currentUserId
              ? getQuestionnaireAnswerCount(event.id, currentUserId)
              : 0;

            const rsvpStatus = registration?.rsvpStatus || "none";
            const paymentConfirmed = registration?.paymentStatus === "paid" || registration?.rsvpStatus === "confirmed";
            const needsPayment =
              rsvpStatus === "hold" && event.requiresPayment && registration?.paymentStatus !== "paid";
            // Show questionnaire only after payment confirmed
            const showQuestionnaire = paymentConfirmed && !registration?.questionnaireCompleted;

            return (
              <div
                key={event.id}
                data-testid={`event-card-${event.id}`}
                className="border border-beige-frame rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-dark mb-2">
                      {event.title}
                    </h2>
                    <p className="text-sm text-gray-medium mb-1">
                      {event.city} • {formatDate(event.datetime)} at {formatTime(event.datetime)}
                    </p>
                    {event.description && (
                      <p className="text-sm text-gray-medium mb-2">
                        {event.description}
                      </p>
                    )}
                    {event.capacity && (
                      <p className="text-xs text-gray-medium mb-2">
                        {availableCapacity > 0
                          ? `${availableCapacity} of ${event.capacity} spots available`
                          : `Full (${event.capacity} capacity)`}
                        {rsvpStatus === "waitlisted" && " • You're on waitlist"}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {rsvpStatus === "confirmed" && (
                        <span 
                          data-testid={`payment-confirmed-${event.id}`}
                          className="text-xs px-2 py-1 rounded bg-green-100 text-green-800"
                        >
                          ✓ Confirmed
                        </span>
                      )}
                      {rsvpStatus === "hold" && (
                        <span 
                          data-testid={`registration-status-hold-${event.id}`}
                          className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800"
                        >
                          ⏱ Hold (expires in 10 min)
                        </span>
                      )}
                      {rsvpStatus === "waitlisted" && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                          📋 Waitlisted
                        </span>
                      )}
                      {event.requiresPayment && (
                        <span className="text-xs text-gray-medium">💳 Payment Required</span>
                      )}
                      {registration?.questionnaireCompleted && (
                        <span 
                          data-testid={`questionnaire-completed-badge-${event.id}`}
                          className="text-xs px-2 py-1 rounded bg-green-100 text-green-800"
                        >
                          ✓ Questionnaire Complete
                        </span>
                      )}
                    </div>
                    {/* Questionnaire section - only show after payment confirmed */}
                    {showQuestionnaire && (
                      <div 
                        data-testid="event-questionnaire-section"
                        className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg"
                      >
                        <p className="text-sm text-orange-800 mb-2">
                          Please complete the questionnaire to be eligible for matching.
                        </p>
                        <Link
                          href={`/events/${event.id}/questions`}
                          data-testid={`event-answer-questions-${event.id}`}
                          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity inline-block"
                        >
                          Answer Questions (10 required)
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    {rsvpStatus === "confirmed" ? (
                      <span className="text-sm text-green-800 font-medium">
                        ✓ Attending
                      </span>
                    ) : needsPayment ? (
                      <button
                        data-testid={`event-pay-now-${event.id}`}
                        onClick={() => handlePay(registration!.id, event.title)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        💳 Pay Now (Demo)
                      </button>
                    ) : rsvpStatus === "hold" ? (
                      <span className="text-sm text-yellow-800">
                        Complete Payment
                      </span>
                    ) : rsvpStatus === "waitlisted" ? (
                      <span className="text-sm text-blue-800">
                        On Waitlist
                      </span>
                    ) : canRSVPToEvent ? (
                      <button
                        data-testid={`event-rsvp-${event.id}`}
                        onClick={() => {
                          console.log("RSVP clicked for event:", event.id);
                          handleRSVP(event.id);
                        }}
                        className="bg-red-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        RSVP
                      </button>
                    ) : (
                      <span className="text-sm text-gray-medium">
                        {!currentUserId
                          ? "Register First"
                          : !userApproved && getRole() !== "host" && getRole() !== "admin"
                          ? "Pending Approval"
                          : "Unavailable"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
