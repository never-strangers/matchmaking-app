"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Props = {
  eventId: string;
  round1RevealedAt: string | null;
  round2RevealedAt: string | null;
  round3RevealedAt: string | null;
  lastRevealedRound: number;
  round1Count: number;
  round2Count: number;
  round3Count: number;
};

export function MatchRevealControl({
  eventId,
  round1RevealedAt,
  round2RevealedAt,
  round3RevealedAt,
  lastRevealedRound,
  round1Count,
  round2Count,
  round3Count,
}: Props) {
  const router = useRouter();
  const [loadingRound, setLoadingRound] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRevealRound = async (round: 1 | 2 | 3) => {
    setLoadingRound(round);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/reveal-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ round }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(
          typeof body?.error === "string" ? body.error : "Failed to reveal round"
        );
        return;
      }
      const data = (await res.json()) as {
        ok: boolean;
        round: number;
        alreadyRevealed?: boolean;
        pairsInRound: number;
      };
      if (data.alreadyRevealed) {
        setMessage(`Round ${round} was already revealed.`);
      } else {
        setMessage(
          `Round ${round} revealed (${data.pairsInRound} pair${data.pairsInRound === 1 ? "" : "s"}).`
        );
      }
      router.refresh();
    } catch (err) {
      console.error(err);
      setMessage("Failed to reveal round");
    } finally {
      setLoadingRound(null);
    }
  };

  const totalPairs = round1Count + round2Count + round3Count;

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Revealed: Round <span className="font-semibold">{lastRevealedRound}/3</span>
        {totalPairs > 0 && (
          <> · Round 1: {round1Count} · Round 2: {round2Count} · Round 3: {round3Count}</>
        )}{" "}
        pair{totalPairs === 1 ? "" : "s"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => handleRevealRound(1)}
          disabled={
            loadingRound !== null ||
            !!round1RevealedAt ||
            round1Count === 0
          }
          data-testid="admin-reveal-round-1"
        >
          {loadingRound === 1
            ? "Revealing…"
            : round1RevealedAt
            ? "Round 1 revealed"
            : `Reveal Round 1${round1Count > 0 ? ` (${round1Count})` : ""}`}
        </Button>
        <Button
          size="sm"
          onClick={() => handleRevealRound(2)}
          disabled={
            loadingRound !== null ||
            !!round2RevealedAt ||
            round2Count === 0 ||
            !round1RevealedAt
          }
          data-testid="admin-reveal-round-2"
        >
          {loadingRound === 2
            ? "Revealing…"
            : round2RevealedAt
            ? "Round 2 revealed"
            : `Reveal Round 2${round2Count > 0 ? ` (${round2Count})` : ""}`}
        </Button>
        <Button
          size="sm"
          onClick={() => handleRevealRound(3)}
          disabled={
            loadingRound !== null ||
            !!round3RevealedAt ||
            round3Count === 0 ||
            !round2RevealedAt
          }
          data-testid="admin-reveal-round-3"
        >
          {loadingRound === 3
            ? "Revealing…"
            : round3RevealedAt
            ? "Round 3 revealed"
            : `Reveal Round 3${round3Count > 0 ? ` (${round3Count})` : ""}`}
        </Button>
      </div>
      {totalPairs === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Run matching first to compute Round 1–3 pairs for this event.
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
