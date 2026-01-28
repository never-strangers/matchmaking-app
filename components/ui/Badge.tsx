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
  const baseStyles = "inline-flex items-center font-medium rounded-lg";
  
  const variants = {
    default:
      "bg-[var(--bg-muted)] text-[var(--text)] border border-[var(--border)]",
    success:
      "bg-[var(--success-light)] text-[var(--success)] border border-[var(--success)]/20",
    warning:
      "bg-[var(--warning-light)] text-[var(--warning)] border border-[var(--warning)]/20",
    danger:
      "bg-[var(--danger-light)] text-[var(--danger)] border border-[var(--danger)]/20",
    info:
      "bg-[var(--info-light)] text-[var(--info)] border border-[var(--info)]/20",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
}
