import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import SectionTitle from "@/components/admin/SectionTitle";
import StepCard from "@/components/admin/StepCard";
import MatchesSidebar from "@/components/admin/MatchesSidebar";
import MatchRow from "@/components/admin/MatchRow";
import Card from "@/components/admin/Card";
import {
  signups,
  matchesRound1,
  matchingSummary,
} from "@/lib/admin/matches.mock";

export default function MatchesPage() {
  const latestSignups = signups.slice(0, 3);
  const topMatches = matchesRound1.slice(0, 5);

  return (
    <AdminShell twoColumn>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        {/* Left Column - Steps */}
        <div>
          {/* Step 1: Signups */}
          <SectionTitle
            number="1"
            title="Signups"
            subtitle="Signups are final once matches are revealed"
          />
          <StepCard>
            <div className="space-y-3 mb-4">
              {latestSignups.map((signup, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-2 border-b border-beige-frame last:border-0"
                >
                  <span className="text-sm text-gray-dark">{signup.name}</span>
                  <span className="text-xs text-gray-medium font-mono">
                    {signup.date}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="#"
              className="text-xs text-gray-medium hover:text-gray-dark transition-colors"
            >
              Manage {signups.length} guests →
            </Link>
          </StepCard>

          {/* Step 2: Matching */}
          <SectionTitle
            number="2"
            title="Matching"
            subtitle="Use the algorithm to calculate the optimal matches among all of your guests."
          />
          <StepCard>
            <h3 className="text-base font-medium text-gray-dark mb-2">
              Calculate matches
            </h3>
            <p className="text-sm text-gray-medium mb-6">
              Run the matching algorithm to generate optimal pairings based on
              compatibility scores and preferences.
            </p>

            {/* Slider-like visual bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-medium uppercase tracking-wide">
                    Romantic-Matched
                  </span>
                  <span className="text-sm font-semibold text-gray-dark">
                    {matchingSummary.romanticMatched}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-medium uppercase tracking-wide">
                    Friend-Matched
                  </span>
                  <span className="text-sm font-semibold text-gray-dark">
                    {matchingSummary.friendMatched}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-beige-frame rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-red-accent"
                    style={{
                      width: `${
                        (matchingSummary.romanticMatched /
                          (matchingSummary.romanticMatched +
                            matchingSummary.friendMatched)) *
                        100
                      }%`,
                    }}
                  />
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500"
                    style={{
                      width: `${
                        (matchingSummary.friendMatched /
                          (matchingSummary.romanticMatched +
                            matchingSummary.friendMatched)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                type="button"
                className="px-4 py-2 bg-red-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Recalculate
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-dark text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Options
              </button>
            </div>

            <p className="text-xs text-gray-medium mb-6">
              Calculated: {matchingSummary.calculatedAt}
            </p>

            {/* Top 5 matches preview */}
            <div className="mb-4">
              <h4 className="text-xs text-gray-medium uppercase tracking-wide mb-3">
                Top Matches Preview
              </h4>
              <div className="space-y-2">
                {topMatches.map((match, index) => (
                  <div
                    key={index}
                    className="py-2 border-b border-beige-frame last:border-0"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-dark truncate">
                        {match.a} + {match.b}
                      </span>
                      <span className="text-xs font-medium text-gray-dark ml-2">
                        {match.score.toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-xs text-gray-medium font-mono">
                      {match.group}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="#"
              className="text-xs text-gray-medium hover:text-gray-dark transition-colors"
            >
              All {matchesRound1.length} matches →
            </Link>
          </StepCard>

          {/* Step 3: Finalize */}
          <SectionTitle number="3" title="Finalize these results" />
          <StepCard>
            <div className="text-center">
              <button
                type="button"
                className="px-6 py-3 bg-red-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                List event & notify followers →
              </button>
            </div>
          </StepCard>
        </div>

        {/* Right Column - Sidebar */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <MatchesSidebar matches={matchesRound1} />
        </div>
      </div>
    </AdminShell>
  );
}

