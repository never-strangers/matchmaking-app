import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white border border-beige-frame rounded-xl p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

