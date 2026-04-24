"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PayToConfirmButton } from "@/app/events/PayToConfirmButton";
import { EventPreviewModal } from "@/components/events/EventPreviewModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCityFlag } from "@/lib/geo/cities";
import { cityForFilter } from "@/lib/constants/profileOptions";
import { formatEventCardDate } from "@/lib/time/formatEventTime";
import { formatLocalPrice } from "@/lib/pricing/localCurrency";
import type { EventPreviewData, AttendeePreviewState } from "@/lib/events/eventPreview";

type ListEvent = {
  id: string;
  title: string;
  status: string;
  city?: string | null;
  category?: string | null;
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
  checkedIn: boolean;
  hasRevealedMatches: boolean;
  posterUrl?: string | null;
  price_cents?: number | null;
};

type Props = {
  events: ListEvent[];
  availableCities: string[];
  userCity: string | null;
  initialCity: string | null;
  initialCategory: string | null;
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All" },
  { value: "friends", label: "Friends" },
  { value: "dating", label: "Dating" },
] as const;

/** Normalize a city label for comparison */
function normalizeCityLabel(city: string | null): string | null {
  if (!city) return null;
  return cityForFilter(city) ?? city;
}

export function EventsListClient({
  events,
  availableCities,
  userCity,
  initialCity,
  initialCategory,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolvedUserCityLabel = normalizeCityLabel(userCity) ?? "";

  const [selectedCity, setSelectedCity] = useState<string>(
    initialCity ?? resolvedUserCityLabel
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory ?? ""
  );

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (selectedCity) {
      params.set("city", selectedCity);
    } else {
      params.delete("city");
    }
    if (selectedCategory) {
      params.set("category", selectedCategory);
    } else {
      params.delete("category");
    }
    const qs = params.toString();
    router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, selectedCategory]);

  const filteredEvents = events.filter((ev) => {
    if (selectedCity) {
      const evCityLabel = normalizeCityLabel(ev.city ?? null);
      if (evCityLabel !== selectedCity && ev.city !== null) return false;
    }
    if (selectedCategory) {
      if ((ev.category ?? "").toLowerCase() !== selectedCategory) return false;
    }
    return true;
  });

  // Modal state
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
    if (selectedEventId) {
      closeModal();
      const qs = selectedCity ? `?returnCity=${encodeURIComponent(selectedCity)}` : "";
      router.push(`/events/${selectedEventId}/questions${qs}`);
    }
  }, [selectedEventId, selectedCity, closeModal, router]);

  const handleContinueToEvent = useCallback(() => {
    if (selectedEventId) { closeModal(); router.push(`/events/${selectedEventId}`); }
  }, [selectedEventId, closeModal, router]);



  const cityOptions = [
    { value: "", label: "All cities" },
    ...availableCities.map((c) => ({
      value: c,
      label: `${getCityFlag(c)} ${c}`.trim(),
    })),
  ];

  return (
    <>
      {/* Filter bar */}
      <div
        className="flex flex-col sm:flex-row gap-3 mb-6 overflow-visible"
        role="group"
        aria-label="Event filters"
      >
        {availableCities.length > 0 && (
          <div className="flex-1 min-w-0 overflow-visible w-full sm:w-auto">
            <label htmlFor="events-filter-city" className="sr-only">
              Filter by city
            </label>
            <select
              id="events-filter-city"
              data-testid="events-filter-city"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full text-sm px-3 py-2.5 min-h-[44px] rounded-lg focus:outline-none focus:ring-2 transition-colors touch-manipulation"
              style={{
                backgroundColor: "var(--bg-panel)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {cityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by category"
          data-testid="events-filter-category"
        >
          {CATEGORY_OPTIONS.map((opt) => {
            const active = selectedCategory === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedCategory(opt.value)}
                aria-pressed={active}
                className="px-4 py-2 min-h-[44px] text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 whitespace-nowrap touch-manipulation flex items-center justify-center"
                style={{
                  backgroundColor: active ? "var(--primary)" : "var(--bg-panel)",
                  color: active ? "var(--primary-fg, #fff)" : "var(--text-subtle)",
                  border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Event grid */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          title="No events found"
          description={
            selectedCity || selectedCategory
              ? "No events match your current filters. Try adjusting or clearing them."
              : "Check back soon for upcoming gatherings in your city."
          }
        />
      ) : (
        <div
          className="grid gap-4 sm:grid-cols-2"
          data-testid="events-list-container"
        >
          {filteredEvents.map((event) => {
            const {
              joined, completed, answerCount, totalQuestions,
              matchesRun, paymentRequired, paid, checkedIn, hasRevealedMatches,
            } = event;

            // ── CTA state machine ──────────────────────────────────────────
            let primaryLabel = "Enter Event";
            let primaryHref = `/events/${event.id}/questions`;
            let showPrimary = true;
            let isEnterEvent = false;
            // Status message shown below badges when there's no button
            let statusMessage: string | null = null;

            if (!joined) {
              // A) Not joined
              isEnterEvent = true;
            } else if (paymentRequired && !paid) {
              // B) Joined but unpaid
              primaryLabel = "Pay to confirm";
              primaryHref = "";
            } else if (!completed) {
              // C) Paid (or free) but questionnaire not done
              primaryLabel = "Complete Questions";
              primaryHref = `/events/${event.id}/questions`;
            } else if (!checkedIn) {
              // D) Questions done, awaiting host check-in
              primaryLabel = "Awaiting check-in";
              showPrimary = false;
              statusMessage = "Your spot is confirmed. The host will check you in at the event.";
            } else if (!matchesRun) {
              // E) Checked in, matching not yet run
              primaryLabel = "Matches pending";
              showPrimary = false;
              statusMessage = "Matches will appear after the host runs matching.";
            } else if (!hasRevealedMatches) {
              // F) Matching done, no reveals yet
              primaryLabel = "Ready — waiting for reveal";
              showPrimary = false;
              statusMessage = "Your matches are ready. The host will reveal them soon.";
            } else {
              // G) Has revealed matches
              primaryLabel = "View Matches";
              primaryHref = `/match?event=${encodeURIComponent(event.id)}`;
            }
            // ──────────────────────────────────────────────────────────────

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
                <Link
                  href={`/events/${event.id}`}
                  className="block flex-shrink-0 overflow-hidden"
                  style={{ borderRadius: "var(--radius-xl) var(--radius-xl) 0 0" }}
                >
                  <div
                    className="w-full flex items-center justify-center"
                    style={{
                      aspectRatio: "3/2",
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
                        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
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
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
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
                    {formatEventCardDate(event.start_at || event.created_at)}
                  </p>

                  {/* City + category */}
                  {(event.city || event.category) && (
                    <p
                      className="text-xs mb-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {event.city && (
                        <span>
                          {getCityFlag(event.city)} {event.city}
                        </span>
                      )}
                      {event.city && event.category && (
                        <span style={{ color: "var(--border-strong)" }}> · </span>
                      )}
                      {event.category && (
                        <span className="capitalize">{event.category}</span>
                      )}
                    </p>
                  )}

                  {/* Title */}
                  <h2
                    className="text-xl mb-3 leading-snug"
                    style={{ fontFamily: "var(--font-heading)", color: "var(--text)" }}
                  >
                    <Link href={`/events/${event.id}`} className="hover:underline">
                      {event.title}
                    </Link>
                  </h2>

                  {/* Price */}
                  {(() => {
                    const priceCents = event.price_cents ?? 0;
                    if (!priceCents) {
                      return (
                        <p className="text-sm font-medium mb-3" style={{ color: "var(--text-subtle)" }}>Free</p>
                      );
                    }
                    const lp = formatLocalPrice(priceCents, event.city);
                    return (
                      <div className="mb-3">
                        {lp?.local ? (
                          <>
                            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                              ≈ {lp.local} est.
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
                              {lp.sgd}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                            {lp?.sgd ?? `S$${(priceCents / 100).toFixed(2)} SGD`}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {joined && paid && <Badge variant="success">Joined</Badge>}
                    {completed && <Badge variant="info">Questionnaire Complete</Badge>}
                    {joined && completed && paymentRequired && paid && (
                      <Badge variant="success">Paid</Badge>
                    )}
                    {joined && !completed && totalQuestions > 0 && (
                      <Badge variant="warning">{answerCount}/{totalQuestions} answered</Badge>
                    )}
                    {joined && completed && checkedIn && !matchesRun && (
                      <Badge variant="warning">Matches pending</Badge>
                    )}
                    {joined && completed && checkedIn && matchesRun && !hasRevealedMatches && (
                      <Badge variant="info">Ready — waiting for reveal</Badge>
                    )}
                  </div>

                  {/* Status message for non-button states */}
                  {statusMessage && (
                    <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                      {statusMessage}
                    </p>
                  )}

                  {/* CTA */}
                  <div className="mt-auto pt-2">
                    {showPrimary ? (
                      primaryLabel === "Pay to confirm" ? (
                        <Button href={`/events/${event.id}`} size="md" fullWidth>
                          Select ticket
                        </Button>
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
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
