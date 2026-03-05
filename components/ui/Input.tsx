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
          <label
            className="block mb-1.5"
            style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-sans)" }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full bg-[var(--bg-panel)] border transition-all duration-200",
            "text-[var(--text)] placeholder:text-[var(--text-subtle)]",
            "focus:outline-none",
            error && "border-[var(--danger)]",
            !error && "border-[var(--border)]",
            className
          )}
          style={{
            borderRadius: "var(--radius-sm)",
            padding: "12px 14px",
            fontSize: 14,
            fontFamily: "var(--font-sans)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(185,15,20,0.1)";
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? "var(--danger)" : "var(--border)";
            e.currentTarget.style.boxShadow = "none";
            props.onBlur?.(e);
          }}
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
