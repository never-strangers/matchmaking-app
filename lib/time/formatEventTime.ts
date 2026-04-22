/**
 * Shared event-time formatting helpers.
 *
 * Times are extracted directly from the ISO string (wall-clock time) so that
 * a KL event stored as "19:30+08:00" always displays as 7:30 PM regardless of
 * the viewer's timezone.  Date parts use the same literal extraction.
 */

/** Extract wall-clock parts from an ISO string without any timezone conversion. */
function parseWallClock(iso: string): {
  year: number; month: number; day: number;
  hours: number; minutes: number; weekday: number;
} | null {
  // Match: YYYY-MM-DDTHH:MM (with optional seconds / offset / Z)
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, min] = m.map(Number);
  // Compute weekday from UTC midnight of the wall-clock date (offset irrelevant for day-of-week)
  const weekday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return { year: y, month: mo, day: d, hours: h, minutes: min, weekday };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(p: NonNullable<ReturnType<typeof parseWallClock>>, withWeekday: boolean): string {
  const wd = withWeekday ? `${WEEKDAYS[p.weekday]}, ` : "";
  return `${wd}${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
}

function fmtTime(p: NonNullable<ReturnType<typeof parseWallClock>>): string {
  const h12 = p.hours % 12 || 12;
  const ampm = p.hours < 12 ? "AM" : "PM";
  const mins = p.minutes.toString().padStart(2, "0");
  return mins === "00" ? `${h12} ${ampm}` : `${h12}:${mins} ${ampm}`;
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
  const p = parseWallClock(iso);
  if (!p) return "TBD";
  const withWeekday = opts?.withWeekday ?? true;
  return `${fmtDate(p, withWeekday)} · ${fmtTime(p)}`;
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
  const sp = parseWallClock(startIso);
  if (!sp) return "TBD";

  const datePart = fmtDate(sp, true);
  const startTime = fmtTime(sp);

  if (!endIso) return `${datePart} · ${startTime}`;

  const ep = parseWallClock(endIso);
  if (!ep) return `${datePart} · ${startTime}`;

  const sameDay = sp.year === ep.year && sp.month === ep.month && sp.day === ep.day;
  const endTime = fmtTime(ep);

  if (sameDay) return `${datePart} · ${startTime} – ${endTime}`;

  return `${datePart} · ${startTime} – ${fmtDate(ep, true)} · ${endTime}`;
}

/**
 * Short date label for compact list rows (e.g. "24 Mar").
 * Works on both server and client (uses process/browser timezone).
 */
export function formatDateLabel(
  dateStr: string | null | undefined,
): string {
  if (!dateStr) return "—";
  const p = parseWallClock(dateStr);
  if (!p) return "—";
  return `${p.day.toString().padStart(2, "0")} ${MONTHS[p.month - 1]}`;
}

/**
 * Date-only label with year (e.g. "24 Mar 2026") for subtitles.
 */
export function formatDateLabelLong(
  dateStr: string | null | undefined,
): string {
  if (!dateStr) return "—";
  const p = parseWallClock(dateStr);
  if (!p) return "—";
  return `${p.day.toString().padStart(2, "0")} ${MONTHS[p.month - 1]} ${p.year}`;
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
  const p = parseWallClock(dateStr);
  if (!p) return "Live event";

  const now = new Date();
  const isToday =
    p.year === now.getFullYear() &&
    p.month === now.getMonth() + 1 &&
    p.day === now.getDate();

  const label = isToday
    ? "Today"
    : `${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;

  return `${label} · Live event`;
}
