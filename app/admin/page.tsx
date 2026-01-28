"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth/useSession";
import { useDemoStore } from "@/lib/demo/demoStore";
import { getMatchesForUser } from "@/lib/matching/questionnaireMatch";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import { MatchUser } from "@/types/questionnaire";
import { listUsers } from "@/lib/demo/userStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";

function AdminPageContent() {
  const router = useRouter();
  const { user, isLoggedIn, isAdmin } = useSession();
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
    if (isLoading) return;

    if (!isLoggedIn || !user) {
      router.replace("/register");
      return;
    }

    // Only admin can access admin page
    if (!isAdmin) {
      router.replace("/events");
      return;
    }

    setIsAdminMode(true);
    setEvents(useDemoStore.getState().listEvents());
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [isLoggedIn, isLoading, router, isAdmin, user, events.length, selectedEventId]);

  const handleRunMatching = async () => {
    if (!selectedEventId) return;

    setIsRunning(true);
    try {
      const event = useDemoStore.getState().getEvent(selectedEventId);
      if (!event) return;

      const registrations = getRegistrationsForEvent(selectedEventId);
      const usersWithAnswers: Array<{
        email: string;
        answers: Record<string, number>;
      }> = [];

      for (const reg of registrations) {
        if (hasAllAnswers(selectedEventId, reg.userEmail)) {
          const answers = getAnswers(selectedEventId, reg.userEmail);
          usersWithAnswers.push({
            email: reg.userEmail,
            answers,
          });
        }
      }

      const sessionUsers: Record<string, { name: string; picture?: string }> = {};
      listUsers().forEach((u) => {
        if (!u.email) return;
        sessionUsers[u.email] = { name: u.name, picture: u.profilePhotoUrl };
      });

      const eventQuestions = event.questions
        .map((qId) => QUESTIONS.find((q) => q.id === qId))
        .filter((q): q is NonNullable<typeof q> => q !== undefined);

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

        const matchResults = getMatchesForUser(
          matchUserA,
          candidates,
          eventQuestions
        );

        const matches = matchResults.slice(0, 3).map((result) => ({
          otherEmail: result.user.id,
          score: result.score,
          aligned: result.aligned.slice(0, 3),
          mismatched: result.mismatched.slice(0, 1),
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

    const demoEmails = Array.from(
      { length: 30 },
      (_, i) => `demo+${String(i + 1).padStart(2, "0")}@gmail.com`
    );

    for (const email of demoEmails) {
      useDemoStore.getState().joinEvent(selectedEventId, email);
    }

    for (const email of demoEmails) {
      for (const questionId of event.questions) {
        const randomAnswer = (Math.floor(Math.random() * 4) + 1) as
          | 1
          | 2
          | 3
          | 4;
        useDemoStore
          .getState()
          .setAnswer(selectedEventId, email, questionId, randomAnswer);
      }
    }

    alert(`Seeded 30 demo participants with random answers!`);
    setEvents([...useDemoStore.getState().listEvents()]);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!isAdminMode || !isLoggedIn) {
    return null;
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
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage events, run matching, and seed demo data"
      />

      {events.length === 0 ? (
        <Card padding="lg">
          <p style={{ color: "var(--text-muted)" }}>No events available.</p>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <Select
              label="Select Event"
              value={selectedEventId || ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
              options={events.map((event) => ({
                value: event.id,
                label: `${event.title} (${event.city})`,
              }))}
            />
          </div>

          {selectedEvent && (
            <div className="space-y-6">
              <Card padding="lg">
                <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text)" }}>
                  Event: {selectedEvent.title}
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                      Total Joined
                    </p>
                    <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                      {registrations.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                      With All Answers
                    </p>
                    <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                      {usersWithAnswers.length}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button
                    onClick={handleRunMatching}
                    disabled={isRunning || usersWithAnswers.length < 2}
                    size="md"
                  >
                    {isRunning ? "Running..." : "Run Matching"}
                  </Button>
                  <Button
                    onClick={handleSeedDemoParticipants}
                    variant="secondary"
                    size="md"
                  >
                    Seed 30 Demo Participants
                  </Button>
                </div>

                {usersWithAnswers.length < 2 && (
                  <p className="text-sm mt-4" style={{ color: "var(--warning)" }}>
                    Need at least 2 users with all answers to run matching.
                  </p>
                )}
              </Card>

              <Card padding="lg">
                <h3 className="text-md font-semibold mb-4" style={{ color: "var(--text)" }}>
                  Participants ({registrations.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {registrations.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      No participants yet.
                    </p>
                  ) : (
                    registrations.map((reg) => {
                      const hasAnswers = hasAllAnswers(
                        selectedEventId!,
                        reg.userEmail
                      );
                      const answerCount = useDemoStore
                        .getState()
                        .getAnswerCount(selectedEventId!, reg.userEmail);
                      const hasMatches = useDemoStore
                        .getState()
                        .hasMatches(selectedEventId!, reg.userEmail);

                      return (
                        <div
                          key={reg.userEmail}
                          className="flex justify-between items-center p-3 border rounded-xl"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                              {reg.userEmail}
                            </p>
                            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                              Joined: {new Date(reg.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {hasAnswers ? (
                              <Badge variant="success">✓ All Answers</Badge>
                            ) : (
                              <Badge variant="warning">{answerCount}/10</Badge>
                            )}
                            {hasMatches && <Badge variant="info">Matched</Badge>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      <div className="mt-8">
        <Link
          href="/events"
          className="text-sm hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Events
        </Link>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-16">
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
