"use client";

import { QuestionCategory } from "@/lib/events/new/mock";

interface PillTabsProps {
  categories: QuestionCategory[];
  selected: QuestionCategory;
  onSelect: (category: QuestionCategory) => void;
}

export default function PillTabs({
  categories,
  selected,
  onSelect,
}: PillTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelect(category)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selected === category
              ? "bg-red-accent text-white"
              : "bg-white text-gray-medium border border-beige-frame hover:border-gray-300"
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

