"use client";

import { formatEventRange, formatDateLabelLong } from "@/lib/time/formatEventTime";

type Props = {
  startAt: string | null | undefined;
  endAt?: string | null;
  city?: string | null;
};

export function EventTimeDisplay({ startAt, endAt }: Props) {
  if (!startAt && !endAt) return null;

  return (
    <div className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
      {formatEventRange(startAt, endAt)}
    </div>
  );
}

export function EventDateSubtitle({
  city,
  startAt,
}: {
  city?: string | null;
  startAt: string | null | undefined;
}) {
  if (!city && !startAt) return null;

  const datePart = startAt
    ? formatDateLabelLong(startAt)
    : null;

  const parts = [city, datePart].filter(Boolean);
  return <>{parts.join(" · ")}</>;
}
