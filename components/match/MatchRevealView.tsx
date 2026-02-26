"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MatchCountdownOverlay } from "@/components/match/MatchCountdownOverlay";
import { MatchCard } from "@/components/match/MatchCard";
import type { RevealStatePayload, RevealMatchPayload } from "@/app/api/events/[id]/matches/reveal-state/route";

type Props = {
  eventId: string;
  eventTitle: string;
};

export function MatchRevealView({ eventId, eventTitle }: Props) {
  const [revealState, setRevealState] = useState<RevealStatePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"idle" | "countdown" | "showing">("idle");
  const [currentCard, setCurrentCard] = useState<RevealMatchPayload | null>(null);

  const fetchRevealState = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/matches/reveal-state`, { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as RevealStatePayload;
    setRevealState(data);
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchRevealState();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchRevealState]);

  const runRevealNext = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/matches/reveal-next`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { revealed: RevealMatchPayload | null };
    return data.revealed;
  }, [eventId]);

  const startReveal = useCallback(() => {
    setPhase("countdown");
  }, []);

  const onCountdownComplete = useCallback(() => {
    setPhase("idle");
    (async () => {
      const revealed = await runRevealNext();
      if (revealed) {
        setCurrentCard(revealed);
        setRevealState((prev) =>
          prev
            ? {
                ...prev,
                revealedCount: prev.revealedCount + 1,
                nextMatch: prev.revealedCount + 2 <= prev.totalCount ? prev.nextMatch : null,
                revealedMatches: [...prev.revealedMatches, revealed],
              }
            : null
        );
        setPhase("showing");
      }
    })();
  }, [runRevealNext]);

  const goToNext = useCallback(() => {
    setCurrentCard(null);
    setPhase("idle");
    fetchRevealState();
  }, [fetchRevealState]);

  if (loading || !revealState) {
    return (
      <Card padding="lg">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Loading matches…
        </p>
      </Card>
    );
  }

  const { totalCount, revealedCount } = revealState;
  const effectiveRevealed = revealedCount + (currentCard ? 1 : 0);
  const hasMore = effectiveRevealed < totalCount;

  if (totalCount === 0) {
    return (
      <Card padding="lg" data-testid="matches-list-container">
        <EmptyState
          title="No matches yet"
          description="Once matching is run, your top matches will appear here."
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
        {revealState.revealedMatches.map((m) => (
          <MatchCard
            key={m.matchResultId}
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
        ))}

        {phase === "showing" && currentCard && (
          <div data-testid="match-card">
            <MatchCard
              eventId={eventId}
              otherProfileId={currentCard.otherProfileId}
              displayName={currentCard.displayName}
              score={currentCard.score}
              aligned={currentCard.aligned}
              mismatched={currentCard.mismatched}
              likedByMe={false}
              mutual={false}
              whatsappUrl={null}
            />
            <div className="mt-4">
              {hasMore ? (
                <Button
                  onClick={goToNext}
                  data-testid="match-reveal-next"
                >
                  Next match
                </Button>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  You&apos;re all caught up. No more matches to reveal.
                </p>
              )}
            </div>
          </div>
        )}

        {phase === "idle" && !currentCard && hasMore && (
          <Card padding="lg">
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              You have {totalCount} match{totalCount !== 1 ? "es" : ""} to reveal.
              {revealedCount > 0 && ` ${revealedCount} already revealed.`}
            </p>
            <Button onClick={startReveal} data-testid="match-reveal-next">
              {revealedCount === 0 ? "Reveal first match" : "Next match"}
            </Button>
          </Card>
        )}

        {phase === "idle" && !currentCard && !hasMore && revealedCount > 0 && (
          <Card padding="lg">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              You&apos;ve seen all {totalCount} match{totalCount !== 1 ? "es" : ""}.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
