"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth/useSession";
import { useDemoStore } from "@/lib/demo/demoStore";
import { getCurrentUser } from "@/lib/auth/googleClientAuth";

export default function MatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, isLoading } = useSession();
  const {
    listEvents,
    getMatches,
    isLiked,
    likeUser,
    hasMutualLike,
    getOrCreateConversation,
  } = useDemoStore();

  const [events, setEvents] = useState(useDemoStore.getState().listEvents());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    searchParams.get("eventId") || null
  );
  const [matches, setMatches] = useState<
    Array<{ otherEmail: string; score: number }>
  >([]);
  const [sessionUsers, setSessionUsers] = useState<
    Record<string, { name: string; picture?: string }>
  >({});

  useEffect(() => {
    // Wait for session to load before checking
    if (isLoading) return;

    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    setEvents(useDemoStore.getState().listEvents());
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }

    // Load session users for names
    try {
      const sessionData = localStorage.getItem("ns_session_v1");
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        const users: Record<string, { name: string; picture?: string }> = {};
        Object.keys(parsed.users || {}).forEach((email) => {
          users[email] = parsed.users[email];
        });
        setSessionUsers(users);
      }
    } catch {}
  }, [isLoggedIn, isLoading, router, events.length, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId || !user?.email) return;
    const eventMatches = getMatches(selectedEventId, user.email);
    setMatches(eventMatches);
  }, [selectedEventId, user, getMatches]);

  const handleLike = (otherEmail: string) => {
    if (!selectedEventId || !user?.email) return;
    likeUser(selectedEventId, user.email, otherEmail);

    // Check if mutual like
    if (hasMutualLike(selectedEventId, user.email, otherEmail)) {
      // Create conversation
      getOrCreateConversation(selectedEventId, user.email, otherEmail);
      alert(`You and ${sessionUsers[otherEmail]?.name || otherEmail} liked each other! You can now message.`);
    }

    // Refresh matches to update UI
    const eventMatches = getMatches(selectedEventId, user.email);
    setMatches(eventMatches);
  };

  const getUserName = (email: string) => {
    return sessionUsers[email]?.name || email;
  };

  const getUserPicture = (email: string) => {
    return sessionUsers[email]?.picture;
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

  const selectedEvent = selectedEventId
    ? useDemoStore.getState().getEvent(selectedEventId)
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-dark mb-2">Your Matches</h1>
        <p className="text-gray-medium">
          View your match percentages and like users to unlock messaging.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No events available. Join an event first.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-dark mb-2">
              Select Event
            </label>
            <select
              value={selectedEventId || ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({event.city})
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <>
              {matches.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800">
                    No matches yet. Admin needs to run matching for this event.
                  </p>
                  <Link
                    href={`/admin?demo_admin=1`}
                    className="text-blue-600 underline text-sm mt-2 inline-block"
                  >
                    Go to Admin Dashboard
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map((match) => {
                    const liked = selectedEventId
                      ? isLiked(selectedEventId, user.email, match.otherEmail)
                      : false;
                    const mutual = selectedEventId
                      ? hasMutualLike(selectedEventId, user.email, match.otherEmail)
                      : false;

                    return (
                      <div
                        key={match.otherEmail}
                        className="border border-beige-frame rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getUserPicture(match.otherEmail) && (
                                <img
                                  src={getUserPicture(match.otherEmail)}
                                  alt={getUserName(match.otherEmail)}
                                  className="w-12 h-12 rounded-full"
                                />
                              )}
                              <div>
                                <h3 className="text-lg font-semibold text-gray-dark">
                                  {getUserName(match.otherEmail)}
                                </h3>
                                <p className="text-sm text-gray-medium">
                                  {match.otherEmail}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <span className="text-2xl font-bold text-red-accent">
                                {match.score}%
                              </span>
                              <span className="text-sm text-gray-medium ml-2">
                                Match
                              </span>
                            </div>
                            <div className="flex gap-2 mt-3">
                              {liked && (
                                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                                  ✓ Liked
                                </span>
                              )}
                              {mutual && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                  💬 Mutual Like - Can Message
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col gap-2">
                            {!liked ? (
                              <button
                                onClick={() => handleLike(match.otherEmail)}
                                className="bg-red-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                              >
                                Like
                              </button>
                            ) : mutual ? (
                              <Link
                                href={`/messages/${selectedEventId}:${[user.email, match.otherEmail].sort().join(":")}`}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap text-center"
                              >
                                Message
                              </Link>
                            ) : (
                              <span className="text-sm text-gray-medium text-center">
                                Waiting for like
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className="mt-8">
        <Link
          href="/events"
          className="text-gray-medium hover:text-gray-dark text-sm"
        >
          ← Back to Events
        </Link>
      </div>
    </div>
  );
}
