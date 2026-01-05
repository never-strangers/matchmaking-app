"use client";

import { Question } from "@/lib/events/new/mock";

interface QuestionChipProps {
  question: Question;
  selected: boolean;
  onClick: () => void;
}

export default function QuestionChip({
  question,
  selected,
  onClick,
}: QuestionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition-all ${
        selected
          ? "border-red-accent bg-red-accent/10"
          : "border-beige-frame bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-gray-dark flex-1">{question.text}</span>
        {question.badge && (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
            {question.badge}
          </span>
        )}
      </div>
    </button>
  );
}

