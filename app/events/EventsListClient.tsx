"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PayToConfirmButton } from "@/app/events/PayToConfirmButton";
import { EventPreviewModal } from "@/components/events/EventPreviewModal";
import type { EventPreviewData, AttendeePreviewState } from "@/lib/events/eventPreview";

type ListEvent = {
  id: string;
  title: string;
  status: string;
  city?: string | null;
  created_at?: string | null;
  start_at?: string | null;
  joined: boolean;
  answerCount: number;
  totalQuestions: number;
  completed: boolean;
  matchesRun: boolean;
  paymentStatus: string;
  paymentRequired: boolean;
  paid: boolean;
  canViewMatches: boolean;
};

export function EventsListClient({ events }: { events: ListEvent[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [previewEvent, setPreviewEvent] = useState<EventPreviewData | null>(null);
  const [previewAttendee, setPreviewAttendee] = useState<AttendeePreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = useCallback(async (eventId: string) => {
    setSelectedEventId(eventId);
    setModalOpen(true);
    setPreviewEvent(null);
    setPreviewAttendee(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/preview`);
      if (!res.ok) {
        setPreviewLoading(false);
        return;
      }
      const data = await res.json();
      setPreviewEvent(data.event ?? null);
      setPreviewAttendee(data.attendee ?? null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedEventId(null);
    setPreviewEvent(null);
    setPreviewAttendee(null);
  }, []);

  const handleCompleteQuestions = useCallback(() => {
    if (selectedEventId) {
      closeModal();
      router.push(`/events/${selectedEventId}/questions`);
    }
  }, [selectedEventId, closeModal, router]);

  const handleContinueToEvent = useCallback(() => {
    if (selectedEventId) {
      closeModal();
      router.push(`/events/${selectedEventId}`);
    }
  }, [selectedEventId, closeModal, router]);

  return (
    <>
      <div className="space-y-4" data-testid="events-list-container">
        {events.map((event) => {
          const {
            joined,
            completed,
            answerCount,
            totalQuestions,
            matchesRun,
            paymentRequired,
            paid,
            canViewMatches,
          } = event;

          let primaryLabel = "Enter Event";
          let primaryHref = `/events/${event.id}/questions`;
          let showPrimary = true;
          let isEnterEvent = false;

          // Questions come after payment: pay first, then questionnaire
          if (joined && paymentRequired && !paid) {
            primaryLabel = "Pay to confirm";
            primaryHref = "";
          } else if (joined && !completed) {
            primaryLabel = "Complete Questions";
            primaryHref = `/events/${event.id}/questions`;
          } else if (joined && completed) {
            if (canViewMatches) {
              primaryLabel = "View Matches";
              primaryHref = "/match";
            } else {
              primaryLabel = "Matches pending";
              primaryHref = "#";
              showPrimary = false;
            }
          } else {
            isEnterEvent = true;
          }

          return (
            <Card key={event.id} variant="elevated" padding="md">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <h2
                    className="text-xl font-semibold mb-2"
                    style={{ color: "var(--text)" }}
                  >
                    <Link href={`/events/${event.id}`} className="hover:underline">
                      {event.title}
                    </Link>
                  </h2>
                  <p
                    className="text-sm mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {(() => {
                      const dateStr = event.start_at || event.created_at;
                      if (!dateStr) return "Live event";
                      const d = new Date(dateStr);
                      const today = new Date();
                      const isToday =
                        d.getDate() === today.getDate() &&
                        d.getMonth() === today.getMonth() &&
                        d.getFullYear() === today.getFullYear();
                      return (
                        (isToday
                          ? "Today"
                          : d.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })) + " · Live event"
                      );
                    })()}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {joined && <Badge variant="success">Joined</Badge>}
                    {completed && (
                      <Badge variant="info">Questionnaire Complete</Badge>
                    )}
                    {joined && completed && paymentRequired && paid && (
                      <Badge variant="success">Paid</Badge>
                    )}
                    {joined && !completed && totalQuestions > 0 && (
                      <Badge variant="warning">
                        {answerCount}/{totalQuestions} answered
                      </Badge>
                    )}
                    {joined && completed && !matchesRun && (
                      <Badge variant="warning">Matches pending</Badge>
                    )}
                  </div>
                  {joined && completed && !matchesRun && (
                    <p
                      className="text-sm mt-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Matches will appear after the host runs matching.
                    </p>
                  )}
                </div>
                {showPrimary && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:ml-4">
                    {primaryLabel === "Pay to confirm" ? (
                      <PayToConfirmButton eventId={event.id} />
                    ) : isEnterEvent ? (
                      <Button
                        size="md"
                        onClick={() => openPreview(event.id)}
                        data-testid="event-enter-btn"
                      >
                        {primaryLabel}
                      </Button>
                    ) : (
                      <Link href={primaryHref}>
                        <Button size="md">{primaryLabel}</Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <EventPreviewModal
        event={previewEvent}
        attendeeState={previewAttendee}
        open={modalOpen}
        onClose={closeModal}
        onCompleteQuestions={handleCompleteQuestions}
        onContinueToEvent={handleContinueToEvent}
        loading={previewLoading}
      />
    </>
  );
}
