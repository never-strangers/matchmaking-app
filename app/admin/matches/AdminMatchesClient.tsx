"use client";

import { useRouter } from "next/navigation";

type EventOption = { id: string; title: string; matchCount: number };

type Props = {
  events: EventOption[];
  selectedEventId: string;
  matchCount: number;
};

export function AdminMatchesClient({ events, selectedEventId, matchCount }: Props) {
  const router = useRouter();

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      router.push(`/admin/matches?event=${encodeURIComponent(id)}`);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2 mt-2">
      <select
        className="w-full sm:w-auto px-3 py-2 text-sm border border-beige-frame rounded-lg bg-white text-gray-dark focus:outline-none focus:ring-2 focus:ring-red-accent"
        value={selectedEventId}
        onChange={handleEventChange}
        data-testid="matches-event-select"
      >
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.title}
            {ev.matchCount > 0 ? ` (${ev.matchCount} pairs)` : ""}
          </option>
        ))}
      </select>
      <p className="text-sm text-gray-medium">
        {matchCount} pair{matchCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
