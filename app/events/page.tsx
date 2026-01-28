"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth/useSession";
import { useDemoStore } from "@/lib/demo/demoStore";
import { getCurrentUser } from "@/lib/auth/googleClientAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

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
    if (isLoading) return;

    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace("/login");
      return;
    }

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

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Upcoming Events"
        subtitle="Join curated gatherings in your city"
        action={
          isAdmin ? (
            <Link href="/admin?demo_admin=1">
              <Button variant="secondary" size="md">
                Admin Dashboard
              </Button>
            </Link>
          ) : undefined
        }
      />

      {events.length === 0 ? (
        <EmptyState
          title="No events available"
          description="Check back soon for upcoming gatherings in your city."
        />
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const joined = isUserJoined(event.id, user.email);
            const answerCount = getAnswerCount(event.id, user.email);
            const allAnswered = hasAllAnswers(event.id, user.email);

            return (
              <Card key={event.id} variant="elevated" padding="md">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>
                      {event.title}
                    </h2>
                    <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                      {event.city} • {formatDate(event.startsAt)}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {joined && (
                        <Badge variant="success">Joined</Badge>
                      )}
                      {allAnswered && (
                        <Badge variant="info">Questionnaire Complete</Badge>
                      )}
                      {joined && !allAnswered && (
                        <Badge variant="warning">
                          {answerCount}/10 answered
                        </Badge>
                      )}
                    </div>
                    {joined && !allAnswered && (
                      <div className="mt-4">
                        <Link href={`/events/${event.id}/questions`}>
                          <Button variant="outline" size="sm">
                            Complete Questions ({answerCount}/10)
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:ml-4">
                    {!joined ? (
                      <Button
                        onClick={() => handleJoin(event.id)}
                        size="md"
                      >
                        Join Event
                      </Button>
                    ) : allAnswered ? (
                      <Link href={`/match?eventId=${event.id}`}>
                        <Button variant="secondary" size="md">
                          View Introductions
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/events/${event.id}/questions`}>
                        <Button variant="outline" size="md">
                          Answer Questions
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-16">
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        </div>
      }
    >
      <EventsPageContent />
    </Suspense>
  );
}
