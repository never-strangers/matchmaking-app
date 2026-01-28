import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary:
      "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:ring-[var(--primary)] shadow-sm",
    secondary:
      "bg-[var(--bg-muted)] text-[var(--text)] hover:bg-[var(--border)] focus:ring-[var(--primary)]",
    outline:
      "border-2 border-[var(--border-strong)] text-[var(--text)] hover:bg-[var(--bg-muted)] focus:ring-[var(--primary)]",
    ghost:
      "text-[var(--text)] hover:bg-[var(--bg-muted)] focus:ring-[var(--primary)]",
    danger:
      "bg-[var(--danger)] text-[var(--danger-foreground)] hover:opacity-90 focus:ring-[var(--danger)] shadow-sm",
    success:
      "bg-[var(--success)] text-[var(--success-foreground)] hover:opacity-90 focus:ring-[var(--success)] shadow-sm",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
