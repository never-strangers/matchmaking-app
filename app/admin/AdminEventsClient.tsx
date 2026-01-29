"use client";

import { useState, useTransition } from "react";
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

export function AdminEventsClient({ events }: Props) {
  const router = useRouter();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useAdminRealtime(() => {
    startTransition(() => router.refresh());
  });

  const handleRunMatching = async (eventId: string) => {
    setRunningId(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/run-matching`, {
        method: "POST",
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
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("Error running matching:", err);
      alert("Error running matching. See console for details.");
    } finally {
      setRunningId(null);
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
      <div className="space-y-3">
        {events.map((event) => {
          const isRunning = runningId === event.id || isPending;
          return (
            <div
              key={event.id}
              className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {event.title}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  Status: {event.status}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Matches: {event.matchCount}
                </p>
                {event.lastRunStatus && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Last run: {event.lastRunStatus}{" "}
                    {event.lastRunAt
                      ? `@ ${new Date(event.lastRunAt).toLocaleTimeString()}`
                      : ""}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRunMatching(event.id)}
                  size="sm"
                  disabled={isRunning}
                >
                  {isRunning ? "Running..." : "Run Matching"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

