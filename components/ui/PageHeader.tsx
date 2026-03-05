import React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  secondaryAction,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4",
        className
      )}
    >
      <div className="flex-1">
        <h1
          className="text-3xl sm:text-4xl mb-2 leading-tight"
          style={{ fontFamily: "var(--font-heading)", color: "var(--text)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-base"
            style={{ fontFamily: "var(--font-sans)", color: "var(--text-muted)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {secondaryAction && <div>{secondaryAction}</div>}
          {action && <div>{action}</div>}
        </div>
      )}
    </div>
  );
}
