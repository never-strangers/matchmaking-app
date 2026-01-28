import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl",
            "text-[var(--text)] placeholder:text-[var(--text-subtle)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]",
            "transition-all duration-200",
            error && "border-[var(--danger)] focus:ring-[var(--danger)]",
            !error && "border-[var(--border)]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-[var(--danger)]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
