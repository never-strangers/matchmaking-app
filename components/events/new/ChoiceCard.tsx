"use client";

interface ChoiceCardProps {
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}

export default function ChoiceCard({
  title,
  subtitle,
  selected,
  onClick,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? "border-red-accent bg-red-accent/10"
          : "border-beige-frame bg-white hover:border-gray-300"
      }`}
    >
      <h3 className="text-lg font-medium text-gray-dark mb-1">{title}</h3>
      <p className="text-sm text-gray-medium">{subtitle}</p>
    </button>
  );
}

