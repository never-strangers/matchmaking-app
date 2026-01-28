import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Card({
  variant = "default",
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  const variants = {
    default:
      "bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl",
    elevated:
      "bg-[var(--bg-panel)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-shadow",
    outlined:
      "bg-transparent border-2 border-[var(--border-strong)] rounded-2xl",
  };

  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  return (
    <div
      className={cn(variants[variant], paddings[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}
