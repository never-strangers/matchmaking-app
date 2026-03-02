"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MatchCountdownOverlay } from "@/components/match/MatchCountdownOverlay";
import { MatchCard } from "@/components/match/MatchCard";
import type { RevealMatchPayload } from "@/app/api/events/[id]/matches/reveal-state/route";
import type { RevealedMatchesResponse } from "@/app/api/events/[id]/revealed-matches/route";

type Props = {
  eventId: string;
  eventTitle: string;
};

export function MatchRevealView({ eventId, eventTitle }: Props) {
  const [revealedMatches, setRevealedMatches] = useState<RevealMatchPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"idle" | "countdown">("idle");
  const [pendingMatch, setPendingMatch] = useState<RevealMatchPayload | null>(null);
  const [lastSeenOrder, setLastSeenOrder] = useState<number>(0);

  const fetchInitialReveals = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/revealed-matches`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = (await res.json()) as RevealedMatchesResponse;
    setRevealedMatches(data.matches);
    setLastSeenOrder(data.lastSeenOrder);
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchInitialReveals();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchInitialReveals]);

  // Poll for newly revealed matches for this attendee
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/events/${eventId}/revealed-matches?since=${lastSeenOrder}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as RevealedMatchesResponse;
        if (cancelled) return;
        if (data.matches.length > 0) {
          // For now we handle the first new match per poll and queue others for the next cycle
          const [next] = data.matches;
          setPendingMatch(next);
          setLastSeenOrder(data.lastSeenOrder);
        }
      } catch {
        // Ignore polling errors; will retry
      } finally {
        if (!cancelled) {
          timeoutId = setTimeout(poll, 3000);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [eventId, lastSeenOrder]);

  const onCountdownComplete = useCallback(() => {
    if (!pendingMatch) {
      setPhase("idle");
      return;
    }
    setRevealedMatches((prev) => [...prev, pendingMatch]);
    setPendingMatch(null);
    setPhase("idle");
  }, [pendingMatch]);

  // When a new pending match arrives, start the countdown
  useEffect(() => {
    if (pendingMatch && phase === "idle") {
      setPhase("countdown");
    }
  }, [pendingMatch, phase]);

  if (loading) {
    return (
      <Card padding="lg">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Loading matches…
        </p>
      </Card>
    );
  }

  if (revealedMatches.length === 0) {
    return (
      <Card padding="lg" data-testid="matches-list-container">
        <EmptyState
          title="Waiting for host"
          description="Matches will appear when the host reveals them. Keep this page open during the reveal."
        />
      </Card>
    );
  }

  return (
    <>
      {phase === "countdown" && (
        <MatchCountdownOverlay onComplete={onCountdownComplete} />
      )}

      <div className="space-y-4" data-testid="matches-list-container">
        {revealedMatches.map((m) => (
          <div key={m.matchResultId} data-testid="match-card">
            <MatchCard
              eventId={eventId}
              otherProfileId={m.otherProfileId}
              displayName={m.displayName}
              score={m.score}
              aligned={m.aligned}
              mismatched={m.mismatched}
              likedByMe={false}
              mutual={false}
              whatsappUrl={null}
            />
          </div>
        ))}
      </div>
    </>
  );
}
