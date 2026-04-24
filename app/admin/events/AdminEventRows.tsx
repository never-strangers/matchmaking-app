"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type EventRow = {
  id: string;
  title: string;
  dateLabel: string;
  deleted_at?: string | null;
};

// ── Active event row with inline delete confirmation ───────────────────────
export function AdminEventRow({ event }: { event: EventRow }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await fetch(`/api/admin/events/${event.id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div
        className="flex items-center gap-3 py-3 -mx-2 px-2 rounded-lg"
        style={{ background: "var(--bg-muted)" }}
        data-testid={`event-row-${event.id}`}
      >
        <span className="text-sm w-14 shrink-0" style={{ color: "var(--text-muted)" }}>
          {event.dateLabel}
        </span>
        <span className="font-medium flex-1 truncate" style={{ color: "var(--text)" }}>
          {event.title}
        </span>
        <span className="text-sm shrink-0" style={{ color: "var(--text-muted)" }}>
          Delete?
        </span>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="text-sm px-3 py-1 rounded-md font-medium shrink-0 transition-opacity disabled:opacity-50"
          style={{ background: "#dc2626", color: "#fff" }}
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm px-3 py-1 rounded-md shrink-0"
          style={{ background: "var(--border)", color: "var(--text)" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-4 py-3 -mx-2 px-2 rounded-lg group hover:bg-[var(--bg-muted)]/50 transition-colors"
      data-testid={`event-row-${event.id}`}
    >
      <span className="text-sm w-14 shrink-0" style={{ color: "var(--text-muted)" }}>
        {event.dateLabel}
      </span>
      <Link
        href={`/admin/events/${event.id}`}
        className="font-medium flex-1 truncate hover:underline"
        style={{ color: "var(--text)" }}
      >
        {event.title}
      </Link>
      <button
        onClick={() => setConfirming(true)}
        title="Delete event"
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0 p-1 rounded hover:bg-red-50"
        style={{ color: "var(--text-muted)" }}
        aria-label={`Delete ${event.title}`}
        data-testid={`event-delete-${event.id}`}
      >
        {/* Trash icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      </button>
    </div>
  );
}

// ── Deleted event row with restore button ─────────────────────────────────
export function DeletedEventRow({ event }: { event: EventRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const daysRemaining = event.deleted_at
    ? Math.max(0, 30 - Math.floor((Date.now() - new Date(event.deleted_at).getTime()) / 86_400_000))
    : 0;

  function handleRestore() {
    startTransition(async () => {
      await fetch(`/api/admin/events/${event.id}/restore`, { method: "POST" });
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center gap-4 py-3 -mx-2 px-2 rounded-lg bg-[var(--bg-muted)]/60"
      data-testid={`event-row-deleted-${event.id}`}
    >
      <span className="text-sm w-14 shrink-0" style={{ color: "var(--text-muted)" }}>
        {event.dateLabel}
      </span>
      <span className="font-medium flex-1 truncate line-through" style={{ color: "var(--text-muted)" }}>
        {event.title}
      </span>
      <span
        className="text-xs shrink-0 px-2 py-0.5 rounded-full"
        style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}
      >
        {daysRemaining}d left
      </span>
      <button
        onClick={handleRestore}
        disabled={pending || daysRemaining === 0}
        className="text-sm px-3 py-1 rounded-md font-medium shrink-0 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
        data-testid={`event-restore-${event.id}`}
      >
        {pending ? "Restoring…" : "Restore"}
      </button>
    </div>
  );
}
