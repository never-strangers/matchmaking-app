"use client";

import { Tier } from "@/lib/events/new/mock";

interface TierCardProps {
  tier: Tier;
  selected: boolean;
  onClick: () => void;
}

export default function TierCard({ tier, selected, onClick }: TierCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-5 rounded-xl border transition-all ${
        selected
          ? "border-red-accent bg-red-accent/10"
          : "border-beige-frame bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-medium text-gray-dark">{tier.title}</h3>
        <span className="px-3 py-1 bg-gray-200 rounded-full text-sm text-gray-dark">
          {tier.priceLabel}
        </span>
      </div>
      <p className="text-sm text-gray-medium">{tier.description}</p>
    </button>
  );
}

