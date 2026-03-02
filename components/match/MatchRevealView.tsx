"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MatchCountdownOverlay } from "@/components/match/MatchCountdownOverlay";
import { MatchCard } from "@/components/match/MatchCard";
import type { RevealMatchPayload } from "@/app/api/events/[id]/matches/reveal-state/route";
import type { MyMatchesResponse } from "@/app/api/events/[id]/my-matches/route";

type Props = {
  eventId: string;
  eventTitle: string;
};

export function MatchRevealView({ eventId, eventTitle }: Props) {
  const [data, setData] = useState<MyMatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"idle" | "countdown">("idle");
  const [pendingRoundMatch, setPendingRoundMatch] = useState<RevealMatchPayload | null>(null);
  const [pendingRoundNum, setPendingRoundNum] = useState<number | null>(null);
  const [lastSeenRevealedRound, setLastSeenRevealedRound] = useState(0);

  const fetchMyMatches = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/my-matches`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    return (await res.json()) as MyMatchesResponse;
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = await fetchMyMatches();
      if (!cancelled && d) {
        setData(d);
        setLastSeenRevealedRound(d.lastRevealedRound);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMyMatches]);

  // Poll for newly revealed round
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const d = await fetchMyMatches();
        if (cancelled || !d) return;
        if (d.lastRevealedRound > lastSeenRevealedRound) {
          const newRound = d.lastRevealedRound;
          const matchForNewRound = d.rounds[newRound as 1 | 2 | 3];
          if (matchForNewRound) {
            setPendingRoundMatch(matchForNewRound);
            setPendingRoundNum(newRound);
          }
          setLastSeenRevealedRound(d.lastRevealedRound);
          setData(d);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) {
          timeoutId = setTimeout(poll, 3000);
        }
      }
    };

    timeoutId = setTimeout(poll, 3000);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [eventId, data, lastSeenRevealedRound, fetchMyMatches]);

  const onCountdownComplete = useCallback(() => {
    if (!pendingRoundMatch || pendingRoundNum == null) {
      setPhase("idle");
      setPendingRoundMatch(null);
      setPendingRoundNum(null);
      return;
    }
    const round = pendingRoundNum;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rounds: {
          ...prev.rounds,
          [round]: pendingRoundMatch,
        },
      };
    });
    setPendingRoundMatch(null);
    setPendingRoundNum(null);
    setPhase("idle");
  }, [pendingRoundMatch, pendingRoundNum]);

  useEffect(() => {
    if (pendingRoundMatch && phase === "idle") {
      setPhase("countdown");
    }
  }, [pendingRoundMatch, phase]);

  if (loading || !data) {
    return (
      <Card padding="lg">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Loading matches…
        </p>
      </Card>
    );
  }

  const { rounds, lastRevealedRound, nextRoundToWaitFor } = data;
  const hasAnyMatch = rounds[1] || rounds[2] || rounds[3];

  if (!hasAnyMatch && !pendingRoundMatch) {
    return (
      <Card padding="lg" data-testid="matches-list-container">
        <EmptyState
          title="Waiting for host"
          description={
            nextRoundToWaitFor
              ? `Matches will appear when the host reveals Round ${nextRoundToWaitFor}. Keep this page open.`
              : "Matches will appear when the host reveals rounds. Keep this page open."
          }
        />
      </Card>
    );
  }

  return (
    <>
      {phase === "countdown" && (
        <MatchCountdownOverlay onComplete={onCountdownComplete} />
      )}

      <div className="space-y-6" data-testid="matches-list-container">
        {([1, 2, 3] as const).map((r) => {
          const match = rounds[r];
          return (
            <div key={r}>
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                Round {r}
                {lastRevealedRound >= r ? "" : " (not yet revealed)"}
              </h3>
              {match ? (
                <div
                  data-testid={r === 1 ? "match-card" : `match-card-round-${r}`}
                  className="mb-4"
                >
                  <MatchCard
                    eventId={eventId}
                    otherProfileId={match.otherProfileId}
                    displayName={match.displayName}
                    score={match.score}
                    aligned={match.aligned}
                    mismatched={match.mismatched}
                    likedByMe={false}
                    mutual={false}
                    whatsappUrl={null}
                  />
                </div>
              ) : nextRoundToWaitFor === r ? (
                <Card padding="md">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Waiting for host to reveal Round {r}.
                  </p>
                </Card>
              ) : lastRevealedRound < r ? (
                <Card padding="md">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Round {r} not yet revealed.
                  </p>
                </Card>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
