"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Props = {
  eventId: string;
  revealedCount: number;
  totalCount: number;
  lastRevealedAt: string | null;
};

export function MatchRevealControl({
  eventId,
  revealedCount,
  totalCount,
  lastRevealedAt,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRevealNext = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/reveal-next-match`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const errorMessage =
          typeof body?.error === "string"
            ? body.error
            : "Failed to reveal next match";
        setMessage(errorMessage);
        return;
      }
      const data = (await res.json()) as {
        revealed: {
          matchResultId: string;
          aProfileId: string;
          bProfileId: string;
          revealOrder: number;
          score: number;
        } | null;
        message?: string;
      };
      if (!data.revealed) {
        setMessage(data.message || "No more matches to reveal for this event.");
      } else {
        setMessage(
          `Revealed match #${data.revealed.revealOrder} (score ${data.revealed.score.toFixed(
            1
          )}%).`
        );
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setMessage("Failed to reveal next match");
    } finally {
      setLoading(false);
    }
  };

  const allRevealed = totalCount > 0 && revealedCount >= totalCount;

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Revealed{" "}
          <span className="font-semibold">
            {revealedCount}/{totalCount}
          </span>{" "}
          match{totalCount === 1 ? "" : "es"} in this event.
          {lastRevealedAt
            ? ` Last revealed at ${new Date(
                lastRevealedAt
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
            : ""}
        </p>
        <Button
          size="sm"
          onClick={handleRevealNext}
          disabled={loading || totalCount === 0 || allRevealed}
          data-testid="admin-reveal-next-match"
        >
          {loading
            ? "Revealing…"
            : allRevealed
            ? "All matches revealed"
            : revealedCount === 0
            ? "Reveal first match"
            : "Reveal next match"}
        </Button>
      </div>
      {totalCount === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Run matching first to populate the reveal queue for this event.
        </p>
      )}
      {message && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {message}
        </p>
      )}
    </div>
  );
}

