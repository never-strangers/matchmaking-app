"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth/useSession";
import { useDemoStore } from "@/lib/demo/demoStore";
import { getMatchesForUser } from "@/lib/matching/questionnaireMatch";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import { MatchUser } from "@/types/questionnaire";
import { getCurrentUser } from "@/lib/auth/googleClientAuth";

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn } = useSession();
  const {
    listEvents,
    getRegistrationsForEvent,
    getAnswers,
    hasAllAnswers,
    setMatches,
    getMatches,
  } = useDemoStore();

  const [events, setEvents] = useState(useDemoStore.getState().listEvents());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const { isLoading } = useSession();

  useEffect(() => {
    // Wait for session to load before checking
    if (isLoading) return;

    const adminMode = searchParams.get("demo_admin") === "1";
    setIsAdminMode(adminMode);

    if (!adminMode) {
      router.replace("/events");
      return;
    }

    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }

    setEvents(useDemoStore.getState().listEvents());
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [isLoggedIn, isLoading, router, searchParams, events.length, selectedEventId]);

  const handleRunMatching = async () => {
    if (!selectedEventId) return;

    setIsRunning(true);
    try {
      const event = useDemoStore.getState().getEvent(selectedEventId);
      if (!event) return;

      // Get all users who joined and have all answers
      const registrations = getRegistrationsForEvent(selectedEventId);
      const usersWithAnswers: Array<{ email: string; answers: Record<string, number> }> = [];

      for (const reg of registrations) {
        if (hasAllAnswers(selectedEventId, reg.userEmail)) {
          const answers = getAnswers(selectedEventId, reg.userEmail);
          usersWithAnswers.push({
            email: reg.userEmail,
            answers,
          });
        }
      }

      // Get session users for names
      const session = getCurrentUser();
      const sessionUsers: Record<string, { name: string; picture?: string }> = {};
      // We'll need to get user info from session storage
      try {
        const sessionData = localStorage.getItem("ns_session_v1");
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          sessionUsers[parsed.currentEmail] = parsed.users[parsed.currentEmail] || {};
          Object.keys(parsed.users || {}).forEach((email) => {
            sessionUsers[email] = parsed.users[email];
          });
        }
      } catch {}

      // Get question definitions for this event
      const eventQuestions = event.questions
        .map((qId) => QUESTIONS.find((q) => q.id === qId))
        .filter((q): q is NonNullable<typeof q> => q !== undefined);

      // Compute matches for each user
      for (const userA of usersWithAnswers) {
        const matchUserA: MatchUser = {
          id: userA.email,
          name: sessionUsers[userA.email]?.name || userA.email,
          city: "",
          answers: userA.answers as any,
        };

        const candidates: MatchUser[] = usersWithAnswers
          .filter((u) => u.email !== userA.email)
          .map((u) => ({
            id: u.email,
            name: sessionUsers[u.email]?.name || u.email,
            city: "",
            answers: u.answers as any,
          }));

        const matchResults = getMatchesForUser(matchUserA, candidates, eventQuestions);

        // Store matches
        const matches = matchResults.map((result) => ({
          otherEmail: result.user.id,
          score: result.score,
        }));

        setMatches(selectedEventId, userA.email, matches);
      }

      alert(`Matching completed for ${usersWithAnswers.length} users!`);
      setEvents([...useDemoStore.getState().listEvents()]);
    } catch (error: any) {
      alert(`Error running matching: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSeedDemoParticipants = () => {
    if (!selectedEventId) return;

    const event = useDemoStore.getState().getEvent(selectedEventId);
    if (!event) return;

    const demoEmails = Array.from({ length: 30 }, (_, i) => `demo+${String(i + 1).padStart(2, "0")}@gmail.com`);

    // Add registrations
    for (const email of demoEmails) {
      useDemoStore.getState().joinEvent(selectedEventId, email);
    }

    // Add random answers for each
    for (const email of demoEmails) {
      for (const questionId of event.questions) {
        const randomAnswer = (Math.floor(Math.random() * 4) + 1) as 1 | 2 | 3 | 4;
        useDemoStore.getState().setAnswer(selectedEventId, email, questionId, randomAnswer);
      }
    }

    alert(`Seeded 30 demo participants with random answers!`);
    setEvents([...useDemoStore.getState().listEvents()]);
  };

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <p className="text-gray-medium">Loading...</p>
      </div>
    );
  }

  if (!isAdminMode || !isLoggedIn) {
    return null; // Will redirect
  }

  const selectedEvent = selectedEventId
    ? useDemoStore.getState().getEvent(selectedEventId)
    : null;
  const registrations = selectedEventId
    ? getRegistrationsForEvent(selectedEventId)
    : [];
  const usersWithAnswers = registrations.filter((r) =>
    hasAllAnswers(selectedEventId!, r.userEmail)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-dark mb-2">
          Admin Dashboard (Demo Mode)
        </h1>
        <p className="text-gray-medium">
          Manage events, run matching, and seed demo data.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No events available.</p>
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
            <div className="space-y-6">
              <div className="bg-white border border-beige-frame rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-dark mb-4">
                  Event: {selectedEvent.title}
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-medium">Total Joined</p>
                    <p className="text-2xl font-bold text-gray-dark">
                      {registrations.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-medium">With All Answers</p>
                    <p className="text-2xl font-bold text-gray-dark">
                      {usersWithAnswers.length}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleRunMatching}
                    disabled={isRunning || usersWithAnswers.length < 2}
                    className="bg-red-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRunning ? "Running..." : "Run Matching"}
                  </button>
                  <button
                    onClick={handleSeedDemoParticipants}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Seed 30 Demo Participants
                  </button>
                </div>

                {usersWithAnswers.length < 2 && (
                  <p className="text-sm text-orange-600 mt-2">
                    Need at least 2 users with all answers to run matching.
                  </p>
                )}
              </div>

              <div className="bg-white border border-beige-frame rounded-lg p-6">
                <h3 className="text-md font-semibold text-gray-dark mb-4">
                  Participants ({registrations.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {registrations.length === 0 ? (
                    <p className="text-gray-medium text-sm">No participants yet.</p>
                  ) : (
                    registrations.map((reg) => {
                      const hasAnswers = hasAllAnswers(selectedEventId!, reg.userEmail);
                      const answerCount = useDemoStore
                        .getState()
                        .getAnswerCount(selectedEventId!, reg.userEmail);
                      const hasMatches = useDemoStore
                        .getState()
                        .hasMatches(selectedEventId!, reg.userEmail);

                      return (
                        <div
                          key={reg.userEmail}
                          className="flex justify-between items-center p-3 border border-beige-frame rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-dark">
                              {reg.userEmail}
                            </p>
                            <p className="text-xs text-gray-medium">
                              Joined: {new Date(reg.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {hasAnswers ? (
                              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                                ✓ All Answers
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800">
                                {answerCount}/10
                              </span>
                            )}
                            {hasMatches && (
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                Matched
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
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
