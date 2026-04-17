/**
 * Shared event-time formatting helpers.
 *
 * Event timestamps are stored as TIMESTAMPTZ in Supabase, but the admin enters
 * them via `datetime-local` inputs which carry NO timezone offset. PostgreSQL
 * (session tz = UTC) therefore stores them as if they were UTC. In reality, the
 * admin intended the "wall-clock" time of the event's city (e.g. 9:30 PM KL).
 *
 * To display the time the admin actually set, we strip any UTC offset before
 * parsing so that `new Date()` treats the value as a naive local-time string.
 * This makes "9:30 PM" appear as "9:30 PM" in every browser, regardless of the
 * viewer's timezone — which is the correct UX for event schedules.
 *
 * If we ever add an `event_timezone` column, we can use it here to convert
 * properly.  Until then, wall-clock display is the safest default.
 */

/**
 * Strip trailing UTC offset (+00:00, +00, Z) so `new Date()` treats the string
 * as a naive (offset-less) timestamp, i.e. wall-clock time.
 */
function stripUtcOffset(iso: string): string {
  return iso.replace(/([+-]\d{2}:\d{2}|[+-]\d{2}|Z)$/, "");
}

function safeParse(iso: string): Date | null {
  const d = new Date(stripUtcOffset(iso));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format a single ISO timestamp as a human-readable date + time.
 *
 * Example output: "Tue, 24 Mar 2026 · 7:30 PM"
 */
export function formatEventDateTime(
  iso: string | null | undefined,
  opts?: { withWeekday?: boolean },
): string {
  if (!iso) return "TBD";
  const d = safeParse(iso);
  if (!d) return "TBD";

  const withWeekday = opts?.withWeekday ?? true;

  const datePart = d.toLocaleDateString("en-US", {
    weekday: withWeekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${datePart} · ${timePart}`;
}

/**
 * Format a start/end range for display on event cards and detail pages.
 *
 * - If only start: "Tue, 24 Mar 2026 · 7:30 PM"
 * - If start + end same day: "Tue, 24 Mar 2026 · 7:30 PM – 10:30 PM"
 * - If start + end different days: "Tue, 24 Mar … 7:30 PM – Wed, 25 Mar … 10:30 PM"
 * - If neither: "TBD"
 */
export function formatEventRange(
  startIso: string | null | undefined,
  endIso?: string | null,
): string {
  if (!startIso) return "TBD";
  const startDate = safeParse(startIso);
  if (!startDate) return "TBD";

  const datePart = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const startTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (!endIso) {
    return `${datePart} · ${startTime}`;
  }

  const endDate = safeParse(endIso);
  if (!endDate) {
    return `${datePart} · ${startTime}`;
  }

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  const endTime = endDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (sameDay) {
    return `${datePart} · ${startTime} – ${endTime}`;
  }

  const endDatePart = endDate.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${datePart} · ${startTime} – ${endDatePart} · ${endTime}`;
}

/**
 * Short date label for compact list rows (e.g. "24 Mar").
 * Works on both server and client (uses process/browser timezone).
 */
export function formatDateLabel(
  dateStr: string | null | undefined,
): string {
  if (!dateStr) return "—";
  const d = safeParse(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

/**
 * Date-only label with year (e.g. "24 Mar 2026") for subtitles.
 */
export function formatDateLabelLong(
  dateStr: string | null | undefined,
): string {
  if (!dateStr) return "—";
  const d = safeParse(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Card-level date for the events list. Shows "Today" when applicable.
 *
 * Example: "Today · Live event" or "Mar 24, 2026 · Live event"
 */
export function formatEventCardDate(
  dateStr: string | null | undefined,
): string {
  if (!dateStr) return "Live event";
  const d = safeParse(dateStr);
  if (!d) return "Live event";

  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const label = isToday
    ? "Today"
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  return `${label} · Live event`;
}
