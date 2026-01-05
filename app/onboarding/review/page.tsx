"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FlowShell from "@/components/events/new/FlowShell";
import PrimaryButton from "@/components/events/new/PrimaryButton";
import TextField from "@/components/events/new/TextField";
import { matchingModes, tiers } from "@/lib/events/new/mock";

interface EventData {
  eventTitle: string;
  hostName: string;
  date: string;
  matchingMode: string;
  selectedTier: string;
  guestCount: number;
  questionCount: number;
}

export default function ReviewPage() {
  const router = useRouter();
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Doe");
  const [email, setEmail] = useState("john@example.com");
  const [accountConfirmed, setAccountConfirmed] = useState(false);

  useEffect(() => {
    // Load event data from localStorage
    const stored = localStorage.getItem("eventData");
    if (stored) {
      setEventData(JSON.parse(stored));
    }
  }, []);

  const handleConfirm = () => {
    // Save event to events list
    if (eventData) {
      const events = JSON.parse(localStorage.getItem("events") || "[]");
      const eventSlug = eventData.eventTitle
        ?.toLowerCase()
        .replace(/\s+/g, "") || "event";
      const newEvent = {
        title: eventData.eventTitle || "New Event",
        city: "Singapore", // Default for now
        date: eventData.date || new Date().toLocaleDateString(),
        url: `app.domain.com/${eventSlug}`,
        matchingMode: eventData.matchingMode,
        guestCount: eventData.guestCount,
        questionCount: eventData.questionCount,
      };
      events.unshift(newEvent); // Add to beginning
      localStorage.setItem("events", JSON.stringify(events));
      
      // Clear event data
      localStorage.removeItem("eventData");
    }
    
    // Navigate to events page
    router.push("/events");
  };

  if (!eventData) {
    return (
      <FlowShell>
        <div className="text-center py-12">
          <p className="text-gray-medium">Loading event data...</p>
        </div>
      </FlowShell>
    );
  }

  const matchingModeLabel = matchingModes.find(
    (m) => m.id === eventData.matchingMode
  )?.title || eventData.matchingMode;
  const tier = tiers.find((t) => t.id === eventData.selectedTier);
  const eventSlug = eventData.eventTitle
    ?.toLowerCase()
    .replace(/\s+/g, "") || "event";

  return (
    <FlowShell maxWidth="max-w-[1200px]">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
        {/* Left Column */}
        <div>
          <h1 className="text-5xl font-light text-gray-dark mb-12">Review</h1>

          {/* YOUR EVENT */}
          <div className="mb-12">
            <h2 className="text-sm font-medium text-gray-dark uppercase tracking-wide mb-4">
              YOUR EVENT
            </h2>
            <div className="space-y-2">
              <p className="text-2xl font-light text-gray-dark">
                {eventData.eventTitle || "Untitled Event"}
              </p>
              <p className="text-sm text-gray-medium font-mono">
                app.domain.com/{eventSlug}
              </p>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="mb-12">
            <h2 className="text-sm font-medium text-gray-dark uppercase tracking-wide mb-4">
              SUMMARY
            </h2>
            <div className="space-y-3">
              <p className="text-base text-gray-dark">
                {eventData.questionCount || 0} questions
              </p>
              <p className="text-base text-gray-dark">
                Up to {eventData.guestCount || 0} participants
              </p>
              <p className="text-base text-gray-dark">
                Matching{" "}
                <span className="text-cyan-500 font-medium">
                  {matchingModeLabel.toLowerCase()}
                </span>
              </p>
              {tier && tier.id !== "free" && (
                <p className="text-base text-gray-dark">
                  Unlocked Matchbox&apos;s{" "}
                  <span className="text-cyan-500 font-medium">
                    full feature set
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* WHAT'S NEXT */}
          <div>
            <h2 className="text-sm font-medium text-gray-dark uppercase tracking-wide mb-4">
              WHAT&apos;S NEXT?
            </h2>
            <ol className="space-y-3 list-decimal list-inside">
              <li className="text-base text-gray-dark">
                Your event link will be active right away.
              </li>
              <li className="text-base text-gray-dark">
                You&apos;ll get an admin link, where you can monitor signups and
                run the algorithm.
              </li>
              <li className="text-base text-gray-dark">
                You&apos;ll get all of this in an email.
              </li>
            </ol>
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div className="space-y-6 mb-8">
            <TextField
              label="First name"
              placeholder="Enter first name"
              value={firstName}
              onChange={setFirstName}
            />
            <TextField
              label="Last name"
              placeholder="Enter last name"
              value={lastName}
              onChange={setLastName}
            />
            <TextField
              label="Email address"
              placeholder="Enter email"
              value={email}
              onChange={setEmail}
            />
          </div>

          {accountConfirmed ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-green-800">
                Account confirmed
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAccountConfirmed(true)}
              className="w-full bg-gray-200 text-gray-dark px-4 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors mb-6"
            >
              Confirm Account
            </button>
          )}

          <p className="text-sm text-gray-medium">
            This event will be billed to {firstName} {lastName} once the event is
            complete.
          </p>

          <div className="mt-8">
            <PrimaryButton onClick={handleConfirm} disabled={!accountConfirmed}>
              Create Event
            </PrimaryButton>
          </div>
        </div>
      </div>
    </FlowShell>
  );
}

