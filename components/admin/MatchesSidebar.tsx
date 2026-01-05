"use client";

import { useState, useMemo } from "react";
import { MatchPair } from "@/lib/admin/matches.mock";
import Card from "./Card";
import MatchRow from "./MatchRow";

interface MatchesSidebarProps {
  matches: MatchPair[];
}

export default function MatchesSidebar({ matches }: MatchesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;
    const query = searchQuery.toLowerCase();
    return matches.filter(
      (match) =>
        match.a.toLowerCase().includes(query) ||
        match.b.toLowerCase().includes(query)
    );
  }, [matches, searchQuery]);

  return (
    <div className="w-full max-w-[400px]">
      <Card className="sticky top-6">
        <h3 className="text-lg font-medium text-gray-dark mb-4">
          Matches – Round 1
        </h3>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search matches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-beige-frame rounded-lg text-sm text-gray-dark placeholder-gray-medium focus:outline-none focus:ring-2 focus:ring-red-accent focus:border-transparent"
          />
        </div>
        <div className="h-[calc(100vh-200px)] overflow-y-auto">
          {filteredMatches.length === 0 ? (
            <p className="text-sm text-gray-medium text-center py-8">
              No matches found
            </p>
          ) : (
            <div>
              {filteredMatches.map((match, index) => (
                <MatchRow key={index} match={match} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

