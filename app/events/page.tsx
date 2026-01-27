"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth/useSession";
import { useDemoStore } from "@/lib/demo/demoStore";
import { getCurrentUser } from "@/lib/auth/googleClientAuth";

function EventsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, isAdmin, isLoading } = useSession();
  const {
    listEvents,
    seedDefaultEvents,
    isUserJoined,
    getAnswerCount,
    hasAllAnswers,
    joinEvent,
    getEvent,
  } = useDemoStore();

  const [events, setEvents] = useState(useDemoStore.getState().listEvents());

  useEffect(() => {
    // Wait for session to load before checking
    if (isLoading) return;
    
    // Check localStorage directly to avoid hook state delays
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    // Seed default events if none exist
    seedDefaultEvents();
    setEvents(useDemoStore.getState().listEvents());
  }, [isLoggedIn, isLoading, router, searchParams]);

  const handleJoin = (eventId: string) => {
    if (!user?.email) return;
    joinEvent(eventId, user.email);
    setEvents([...useDemoStore.getState().listEvents()]);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <p className="text-gray-medium">Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return null; // Will redirect
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-dark">Events</h1>
        {isAdmin && (
          <Link
            href="/admin?demo_admin=1"
            className="bg-red-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Admin Dashboard
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-gray-medium">No events available.</p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const joined = isUserJoined(event.id, user.email);
            const answerCount = getAnswerCount(event.id, user.email);
            const allAnswered = hasAllAnswers(event.id, user.email);

            return (
              <div
                key={event.id}
                className="border border-beige-frame rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-dark mb-2">
                      {event.title}
                    </h2>
                    <p className="text-sm text-gray-medium mb-1">
                      {event.city} • {formatDate(event.startsAt)}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {joined && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                          ✓ Joined
                        </span>
                      )}
                      {allAnswered && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                          ✓ Questionnaire Completed
                        </span>
                      )}
                      {joined && !allAnswered && (
                        <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">
                          {answerCount}/10 answered
                        </span>
                      )}
                    </div>
                    {joined && !allAnswered && (
                      <div className="mt-4">
                        <Link
                          href={`/events/${event.id}/questions`}
                          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity inline-block"
                        >
                          Answer Questions ({answerCount}/10)
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    {!joined ? (
                      <button
                        onClick={() => handleJoin(event.id)}
                        className="bg-red-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        Join
                      </button>
                    ) : allAnswered ? (
                      <Link
                        href={`/match?eventId=${event.id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap inline-block"
                      >
                        View Matches
                      </Link>
                    ) : (
                      <Link
                        href={`/events/${event.id}/questions`}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap inline-block"
                      >
                        Answer Questions
                      </Link>
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

export default function EventsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-16">
        <p className="text-gray-medium">Loading...</p>
      </div>
    }>
      <EventsPageContent />
    </Suspense>
  );
}
