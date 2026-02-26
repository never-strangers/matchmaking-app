"use client";

import { useEffect, useState } from "react";

type Props = {
  onComplete: () => void;
};

export function MatchCountdownOverlay({ onComplete }: Props) {
  const [step, setStep] = useState(3);

  useEffect(() => {
    if (step <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setStep((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, onComplete]);

  if (step <= 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      data-testid="match-countdown-overlay"
      aria-live="polite"
      aria-label={`Countdown ${step}`}
    >
      <span
        className="text-8xl font-bold text-white tabular-nums"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {step}
      </span>
    </div>
  );
}
