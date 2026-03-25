"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Props = {
  onComplete: () => void;
};

export function MatchCountdownOverlay({ onComplete }: Props) {
  const [step, setStep] = useState(10);

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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
      data-testid="match-countdown-overlay"
      aria-live="polite"
      aria-label={`Countdown ${step}`}
    >
      <div className="flex flex-col items-center justify-center flex-1 w-full px-6">
        <p
          className="text-white/60 text-base sm:text-lg font-medium mb-6 tracking-wide text-center"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Your match is about to be revealed…
        </p>
        <span
          className="font-bold text-white leading-none tabular-nums"
          style={{
            fontVariantNumeric: "tabular-nums",
            fontSize: "clamp(6rem, 30vw, 12rem)",
            fontFamily: "var(--font-young-serif)",
          }}
        >
          {step}
        </span>
      </div>

      {/* Logo pinned to the bottom */}
      <div className="pb-10 sm:pb-14 flex items-center justify-center w-full">
        <div className="relative w-[140px] h-[65px] sm:w-[180px] sm:h-[84px]">
          <Image
            src="/logo.png"
            alt="Never Strangers"
            fill
            className="object-contain"
            sizes="(max-width: 640px) 140px, 180px"
          />
        </div>
      </div>
    </div>
  );
}
