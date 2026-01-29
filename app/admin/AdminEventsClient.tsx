"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAdminRealtime } from "@/lib/realtime/useEventRealtime";

export type AdminEventSummary = {
  id: string;
  title: string;
  status: string;
  lastRunStatus: string | null;
  lastRunAt: string | null;
  matchCount: number;
};

type Props = {
  events: AdminEventSummary[];
};

function statusLabel(status: string, matchCount: number): string {
  if (status === "matching_completed" || (status === "live" && matchCount > 0)) return "Matching completed";
  if (status === "live") return "Live";
  if (status === "draft") return "Draft";
  if (status === "closed") return "Closed";
  return status;
}

export function AdminEventsClient({ events }: Props) {
  const router = useRouter();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useAdminRealtime(() => {
    startTransition(() => router.refresh());
  });

  const refresh = () => startTransition(() => router.refresh());

  const handleRunMatching = async (eventId: string) => {
    setRunningId(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/run-matching`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        alert(text || "Failed to run matching");
      } else {
        const data = await res.json().catch(() => null);
        if (data?.pairs != null) {
          alert(`Matching completed with ${data.pairs} pairs.`);
        } else {
          alert("Matching completed.");
        }
      }
      refresh();
    } catch (err) {
      console.error("Error running matching:", err);
      alert("Error running matching. See console for details.");
    } finally {
      setRunningId(null);
    }
  };

  const handleDeleteMatches = async (eventId: string) => {
    if (!confirm("Reset this event? All joined users, answers, likes, and matches will be removed. People can join and answer again, then you can run matching.")) return;
    setDeletingId(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/delete-matches`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        alert(text || "Failed to delete matches");
      } else {
        refresh();
      }
    } catch (err) {
      console.error("Error deleting matches:", err);
      alert("Error deleting matches.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card padding="lg">
      <h2
        className="text-lg font-semibold mb-4"
        style={{ color: "var(--text)" }}
      >
        Events
      </h2>
      <div className="space-y-4">
        {events.map((event) => {
          const isRunning = runningId === event.id || isPending;
          const isDeleting = deletingId === event.id;
          const hasMatches = event.matchCount > 0;
          return (
            <div
              key={event.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b last:border-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {event.title}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Status: {statusLabel(event.status, event.matchCount)}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Matches: {event.matchCount}
                </p>
                <Link
                  href="/admin/matches"
                  className="text-xs mt-1 inline-block hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  View matches
                </Link>
                {event.lastRunStatus && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Last run: {event.lastRunStatus}{" "}
                    {event.lastRunAt
                      ? `@ ${new Date(event.lastRunAt).toLocaleTimeString()}`
                      : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleRunMatching(event.id)}
                  size="sm"
                  disabled={isRunning}
                >
                  {isRunning ? "Running..." : "Run Matching"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => handleDeleteMatches(event.id)}
                >
                  {isDeleting ? "Resetting..." : "Reset event"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

