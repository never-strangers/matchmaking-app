import React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full px-4 py-2.5 bg-[var(--bg-panel)] border rounded-xl",
            "text-[var(--text)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]",
            "transition-all duration-200 appearance-none",
            "bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-right pr-10",
            error && "border-[var(--danger)] focus:ring-[var(--danger)]",
            !error && "border-[var(--border)]",
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = "Select";
