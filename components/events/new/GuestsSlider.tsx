"use client";

import { guestTicks } from "@/lib/events/new/mock";

interface GuestsSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function GuestsSlider({ value, onChange }: GuestsSliderProps) {
  return (
    <div>
      <div className="relative h-2 bg-beige-frame rounded-full mb-8">
        <div
          className="absolute h-2 bg-red-accent rounded-full"
          style={{
            width: `${(value / Math.max(...guestTicks)) * 100}%`,
          }}
        />
        {guestTicks.map((tick) => (
          <button
            key={tick}
            type="button"
            onClick={() => onChange(tick)}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all ${
              value >= tick ? "bg-red-accent" : "bg-gray-300"
            }`}
            style={{
              left: `${(tick / Math.max(...guestTicks)) * 100}%`,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-medium">
        {guestTicks.map((tick) => (
          <button
            key={tick}
            type="button"
            onClick={() => onChange(tick)}
            className={`transition-colors ${
              value === tick ? "text-gray-dark font-medium" : "hover:text-gray-dark"
            }`}
          >
            {tick}
          </button>
        ))}
      </div>
      <div className="mt-4 text-center">
        <span className="text-2xl font-light text-gray-dark">{value}</span>
        <span className="text-sm text-gray-medium ml-2">guests</span>
      </div>
    </div>
  );
}

