import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BaseProps = {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  href?: string;
  children: React.ReactNode;
};

export type ButtonProps = BaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps | "href"> & {
    href?: undefined;
  };

export type LinkButtonProps = BaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

const VARIANTS = {
  primary:
    "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:ring-[var(--primary)] shadow-sm",
  secondary:
    "border-2 border-[var(--border-strong)] text-[var(--text)] hover:bg-[var(--bg-dark)] focus:ring-[var(--primary)]",
  outline:
    "border-2 border-[var(--border-strong)] text-[var(--text)] hover:bg-[var(--bg-dark)] focus:ring-[var(--primary)]",
  ghost:
    "text-[var(--text)] hover:bg-[var(--bg-dark)] focus:ring-[var(--primary)]",
  danger:
    "bg-[var(--danger)] text-[var(--danger-foreground)] hover:opacity-90 focus:ring-[var(--danger)] shadow-sm",
  success:
    "bg-[var(--success)] text-[var(--success-foreground)] hover:opacity-90 focus:ring-[var(--success)] shadow-sm",
};

const SIZES = {
  sm: "px-4 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

const BASE =
  "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 touch-manipulation focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

function classes(
  variant: NonNullable<BaseProps["variant"]>,
  size: NonNullable<BaseProps["size"]>,
  fullWidth: boolean,
  extra?: string
) {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", extra);
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  href,
  className,
  children,
  ...props
}: ButtonProps | LinkButtonProps) {
  const cls = classes(variant, size, fullWidth, className as string | undefined);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button
      className={cls}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
