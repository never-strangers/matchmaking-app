import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  children: React.ReactNode;
}

export function Badge({
  variant = "default",
  size = "sm",
  className,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default:  "bg-[var(--bg-dark)] text-[var(--text)] border border-[var(--border)]",
    success:  "bg-[var(--success-light)] text-[var(--success)]",
    warning:  "bg-[var(--warning-light)] text-[var(--warning)]",
    danger:   "bg-[var(--danger-light)] text-[var(--danger)]",
    info:     "bg-[var(--info-light)] text-[var(--info)]",
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full",
        variants[variant],
        sizes[size],
        className
      )}
      style={{ fontFamily: "var(--font-sans)" }}
      {...props}
    >
      {children}
    </span>
  );
}
