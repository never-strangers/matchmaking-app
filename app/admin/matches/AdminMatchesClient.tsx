"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

type EventOption = { id: string; title: string; matchCount: number };

type MatchRow = {
  aProfileId: string;
  bProfileId: string;
  aName: string;
  bName: string;
  score: number;
  matchType: string;
  round: number;
};

type Props = {
  events: EventOption[];
  selectedEventId: string;
  selectedRound: number;
  roundCounts: Record<number, number>;
  matches: MatchRow[];
};

export function AdminMatchesClient({
  events,
  selectedEventId,
  selectedRound,
  roundCounts,
  matches,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) router.push(`/admin/matches?event=${encodeURIComponent(id)}&round=1`);
  };

  const setRound = (r: number) => {
    router.push(`/admin/matches?event=${encodeURIComponent(selectedEventId)}&round=${r}`);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter(
      (m) =>
        m.aName.toLowerCase().includes(q) ||
        m.bName.toLowerCase().includes(q)
    );
  }, [matches, search]);

  const exportCsv = () => {
    const rows = [
      ["round", "person_a", "person_b", "score", "match_type"],
      ...filtered.map((m) => [
        m.round,
        m.aName,
        m.bName,
        m.score.toFixed(1) + "%",
        m.matchType,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const date = new Date().toISOString().slice(0, 10);
    const filename = `matches_${selectedEventId}_round${selectedRound}_${date}.csv`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Event selector */}
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
      </div>

      {/* Round tabs */}
      <div className="flex gap-1 border-b border-beige-frame" data-testid="round-tabs">
        {[1, 2, 3].map((r) => (
          <button
            key={r}
            onClick={() => setRound(r)}
            data-testid={`round-tab-${r}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedRound === r
                ? "border-red-accent text-red-accent"
                : "border-transparent text-gray-medium hover:text-gray-dark"
            }`}
          >
            Round {r}
            {roundCounts[r] > 0 && (
              <span className="ml-1 text-xs text-gray-medium">({roundCounts[r]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Search + export */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="matches-search"
          className="w-full sm:w-64 px-3 py-2 text-sm border border-beige-frame rounded-lg bg-white text-gray-dark focus:outline-none focus:ring-2 focus:ring-red-accent"
        />
        <button
          onClick={exportCsv}
          data-testid="matches-export-csv"
          className="px-4 py-2 text-sm font-medium rounded-lg border border-beige-frame text-gray-dark hover:bg-beige-frame transition-colors"
        >
          Export CSV
        </button>
        <span className="text-sm text-gray-medium">
          {filtered.length} pair{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {matches.length === 0 ? (
        <p className="text-sm text-gray-medium py-4" data-testid="matches-empty-state">
          No matches yet for Round {selectedRound}.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-medium py-4">No results match your search.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="matches-table">
            <thead>
              <tr className="border-b border-beige-frame text-left text-gray-medium">
                <th className="py-2 pr-4 font-medium">Person A</th>
                <th className="py-2 pr-4 font-medium">Person B</th>
                <th className="py-2 pr-4 font-medium">Score</th>
                <th className="py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, idx) => (
                <tr
                  key={`${m.aProfileId}-${m.bProfileId}-${idx}`}
                  className="border-b border-beige-frame last:border-0"
                >
                  <td className="py-2 pr-4 text-gray-dark">{m.aName}</td>
                  <td className="py-2 pr-4 text-gray-dark">{m.bName}</td>
                  <td className="py-2 pr-4 font-medium text-gray-dark">{m.score.toFixed(1)}%</td>
                  <td
                    className="py-2 font-medium text-gray-dark"
                    title={m.matchType === "date" ? "Date match" : "Friend fallback"}
                    data-testid="admin-match-type"
                    data-match-type={m.matchType}
                  >
                    {m.matchType === "date" ? "D" : "F"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
