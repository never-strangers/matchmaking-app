import { MatchPair } from "@/lib/admin/matches.mock";

interface MatchRowProps {
  match: MatchPair;
}

export default function MatchRow({ match }: MatchRowProps) {
  return (
    <div className="py-3 border-b border-beige-frame last:border-0">
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-dark truncate">
            {match.a} + {match.b}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <span className="text-sm font-medium text-gray-dark">
            {match.score.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-medium font-mono">{match.group}</span>
        {match.tags?.includes("romantic") && (
          <span className="text-xs">💕</span>
        )}
        {match.tags?.includes("friend") && (
          <span className="text-xs">👥</span>
        )}
      </div>
    </div>
  );
}

