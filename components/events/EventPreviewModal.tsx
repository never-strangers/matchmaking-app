"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { EventPreviewData, AttendeePreviewState } from "@/lib/events/eventPreview";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type EventPreviewModalProps = {
  event: EventPreviewData | null;
  attendeeState: AttendeePreviewState | null;
  open: boolean;
  onClose: () => void;
  onCompleteQuestions: () => void;
  onContinueToEvent: () => void;
  loading?: boolean;
};

export function EventPreviewModal({
  event,
  attendeeState,
  open,
  onClose,
  onCompleteQuestions,
  onContinueToEvent,
  loading = false,
}: EventPreviewModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const lines = event?.whats_included
    ? event.whats_included
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const startAt = event?.start_at ?? null;
  const endAt = event?.end_at ?? null;
  const questionsComplete = attendeeState?.questions_complete ?? false;
  const answeredCount = attendeeState?.answered_count ?? 0;
  const totalQuestions = attendeeState?.total_questions ?? 0;
  const paymentRequired = event?.payment_required ?? false;
  const paid = attendeeState?.paid ?? false;
  const canShowQuestionStep = !paymentRequired || paid;
  const requiresQuestions = canShowQuestionStep && totalQuestions > 0 && !questionsComplete;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      data-testid="event-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-preview-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl bg-[var(--bg)] border border-[var(--border)]">
        {loading || !event ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
            Loading…
          </div>
        ) : (
          <>
            {event.poster_url ? (
              <img
                src={event.poster_url}
                alt=""
                className="w-full aspect-[3/2] object-cover rounded-t-2xl"
              />
            ) : (
              <div
                className="w-full aspect-[3/2] flex items-center justify-center rounded-t-2xl text-[var(--text-muted)]"
                style={{ backgroundColor: "var(--bg-panel)" }}
              >
                No poster image
              </div>
            )}
            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant={event.category === "dating" ? "info" : "default"}>
                  {event.category === "dating" ? "Dating" : "Friends"}
                </Badge>
                {event.city && (
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {event.city}
                  </span>
                )}
              </div>
              <h2
                id="event-preview-title"
                className="text-xl font-semibold mb-2"
                style={{ color: "var(--text)" }}
              >
                {event.title}
              </h2>

              {(startAt || endAt) && (
                <div className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                  {startAt && (
                    <span>
                      Start: {formatDate(startAt)} {formatTime(startAt)}
                    </span>
                  )}
                  {endAt && (
                    <span className={startAt ? " ml-4" : ""}>
                      End: {formatDate(endAt)} {formatTime(endAt)}
                    </span>
                  )}
                </div>
              )}

              {event.location && (
                <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                  Location: {event.location}
                </p>
              )}

              <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                {event.payment_required
                  ? `Price: ${(event.price_cents / 100).toFixed(2)}`
                  : "Free"}
              </p>

              {event.description && (
                <p
                  className="text-sm mb-4 whitespace-pre-wrap"
                  style={{ color: "var(--text)" }}
                >
                  {event.description}
                </p>
              )}

              {lines.length > 0 && (
                <div className="mb-4">
                  <h3
                    className="text-sm font-semibold mb-2"
                    style={{ color: "var(--text)" }}
                  >
                    What&apos;s Included
                  </h3>
                  <ul
                    className="list-disc list-inside text-sm space-y-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {lines.map((line, i) => (
                      <li key={i}>{line.replace(/^[-•]\s*/, "")}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Card variant="default" padding="md" className="mb-4">
                {paymentRequired && !paid ? (
                  <>
                    <p
                      className="text-sm font-medium mb-2"
                      style={{ color: "var(--text)" }}
                    >
                      Payment required — confirm your spot before answering questions.
                    </p>
                    <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                      Price: {(event.price_cents / 100).toFixed(2)} SGD
                    </p>
                    <Button
                      size="md"
                      onClick={onContinueToEvent}
                      data-testid="event-preview-go-to-payment"
                    >
                      Continue to payment
                    </Button>
                  </>
                ) : requiresQuestions ? (
                  <>
                    <p
                      className="text-sm font-medium mb-2"
                      style={{ color: "var(--text)" }}
                    >
                      Questionnaire required — please complete before the event starts.
                    </p>
                    <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                      {answeredCount}/{totalQuestions} questions answered
                    </p>
                    <Button
                      size="md"
                      onClick={onCompleteQuestions}
                      data-testid="event-preview-complete-questions"
                    >
                      Complete Questions
                    </Button>
                  </>
                ) : (
                  <>
                    <p
                      className="text-sm font-medium mb-3"
                      style={{ color: "var(--text)" }}
                    >
                      Questionnaire complete ✅
                    </p>
                    <Button
                      size="md"
                      onClick={onContinueToEvent}
                      data-testid="event-preview-continue"
                    >
                      Continue to Event
                    </Button>
                  </>
                )}
              </Card>

              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                  data-testid="event-preview-close"
                >
                  Close
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
