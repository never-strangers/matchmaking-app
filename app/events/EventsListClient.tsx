"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  posterUrl?: string | null;
};

function formatEventDate(dateStr: string | null | undefined): string {
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
}

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
      if (!res.ok) { setPreviewLoading(false); return; }
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
    if (selectedEventId) { closeModal(); router.push(`/events/${selectedEventId}/questions`); }
  }, [selectedEventId, closeModal, router]);

  const handleContinueToEvent = useCallback(() => {
    if (selectedEventId) { closeModal(); router.push(`/events/${selectedEventId}`); }
  }, [selectedEventId, closeModal, router]);

  const handleContinueToPayment = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ event_id: selectedEventId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data?.error || "Failed to start checkout"); return; }
      if (data?.url) { window.location.href = data.url; }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Something went wrong. Please try again.");
    }
  }, [selectedEventId]);

  return (
    <>
      <div
        className="grid gap-4 sm:grid-cols-2"
        data-testid="events-list-container"
      >
        {events.map((event) => {
          const {
            joined, completed, answerCount, totalQuestions,
            matchesRun, paymentRequired, paid, canViewMatches,
          } = event;

          let primaryLabel = "Enter Event";
          let primaryHref = `/events/${event.id}/questions`;
          let showPrimary = true;
          let isEnterEvent = false;

          if (joined && paymentRequired && !paid) {
            primaryLabel = "Pay to confirm";
            primaryHref = "";
          } else if (joined && !completed) {
            primaryLabel = "Complete Questions";
            primaryHref = `/events/${event.id}/questions`;
          } else if (joined && completed) {
            if (canViewMatches) {
              primaryLabel = "View Matches";
              primaryHref = `/match?event=${encodeURIComponent(event.id)}`;
            } else {
              primaryLabel = "Matches pending";
              primaryHref = "#";
              showPrimary = false;
            }
          } else {
            isEnterEvent = true;
          }

          return (
            <div
              key={event.id}
              data-testid={`event-card-${event.id}`}
              className="group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: "var(--bg-panel)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--shadow-sm)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)";
              }}
            >
              {/* Image area */}
              <Link href={`/events/${event.id}`} className="block flex-shrink-0 overflow-hidden" style={{ borderRadius: "var(--radius-xl) var(--radius-xl) 0 0" }}>
                <div
                  className="w-full flex items-center justify-center"
                  style={{
                    height: "180px",
                    backgroundColor: "var(--bg-dark)",
                    borderBottom: "1px solid var(--border)",
                    overflow: "hidden",
                  }}
                >
                  {event.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.posterUrl}
                      alt={event.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: "var(--border-strong)", opacity: 0.6 }}
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  )}
                </div>
              </Link>

              {/* Card content */}
              <div className="flex flex-col flex-1 p-5">
                {/* Date */}
                <p
                  className="text-xs mb-2 font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-subtle)", fontFamily: "var(--font-sans)" }}
                >
                  {formatEventDate(event.start_at || event.created_at)}
                </p>

                {/* Title */}
                <h2
                  className="text-xl mb-3 leading-snug"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--text)" }}
                >
                  <Link href={`/events/${event.id}`} className="hover:underline">
                    {event.title}
                  </Link>
                </h2>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {joined && <Badge variant="success">Joined</Badge>}
                  {completed && <Badge variant="info">Questionnaire Complete</Badge>}
                  {joined && completed && paymentRequired && paid && (
                    <Badge variant="success">Paid</Badge>
                  )}
                  {joined && !completed && totalQuestions > 0 && (
                    <Badge variant="warning">{answerCount}/{totalQuestions} answered</Badge>
                  )}
                  {joined && completed && !matchesRun && (
                    <Badge variant="warning">Matches pending</Badge>
                  )}
                </div>

                {joined && completed && !matchesRun && (
                  <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                    Matches will appear after the host runs matching.
                  </p>
                )}

                {/* CTA */}
                {showPrimary && (
                  <div className="mt-auto pt-2">
                    {primaryLabel === "Pay to confirm" ? (
                      <PayToConfirmButton eventId={event.id} />
                    ) : isEnterEvent ? (
                      <Button
                        size="md"
                        onClick={() => openPreview(event.id)}
                        data-testid="event-enter-btn"
                        fullWidth
                      >
                        {primaryLabel}
                      </Button>
                    ) : (
                      <Button href={primaryHref} size="md" fullWidth>
                        {primaryLabel}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
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
        onContinueToPayment={handleContinueToPayment}
        loading={previewLoading}
      />
    </>
  );
}
