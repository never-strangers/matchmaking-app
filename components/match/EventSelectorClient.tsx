"use client";

import { useRouter } from "next/navigation";
import type { MatchEventItem } from "@/app/api/match/events/route";

type Props = {
  events: MatchEventItem[];
  selectedId: string | null;
};

export function EventSelectorClient({ events, selectedId }: Props) {
  const router = useRouter();

  return (
    <div className="mb-6">
      <label
        htmlFor="match-event-selector"
        className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        Event
      </label>
      <select
        id="match-event-selector"
        data-testid="match-event-selector"
        value={selectedId ?? ""}
        onChange={(e) => {
          if (e.target.value) router.push(`/match?event=${e.target.value}`);
        }}
        className="w-full sm:w-auto rounded-lg border px-3 py-2 text-sm"
        style={{
          backgroundColor: "var(--bg-panel)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.title}
            {ev.city ? ` — ${ev.city}` : ""}
            {ev.hasRevealedMatches ? "" : " (waiting for reveal)"}
          </option>
        ))}
      </select>
    </div>
  );
}
