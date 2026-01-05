"use client";

import { useRouter } from "next/navigation";

interface PrimaryButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export default function PrimaryButton({
  children,
  href,
  onClick,
  disabled = false,
}: PrimaryButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="px-8 py-3 bg-red-accent text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

