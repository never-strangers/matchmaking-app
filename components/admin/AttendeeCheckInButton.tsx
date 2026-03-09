"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Props = {
  eventId: string;
  attendeeId: string;
  checkedIn: boolean;
  testId?: string;
};

export function AttendeeCheckInButton({ eventId, attendeeId, checkedIn, testId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [localCheckedIn, setLocalCheckedIn] = useState(checkedIn);

  // Keep local state in sync if server state changes underneath
  if (localCheckedIn !== checkedIn && !loading) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    setLocalCheckedIn(checkedIn);
  }

  const handleToggle = async () => {
    setLoading(true);
    const nextChecked = !localCheckedIn;
    // Optimistic update so the button doesn't briefly flicker back
    setLocalCheckedIn(nextChecked);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attendee_id: attendeeId, checked_in: nextChecked }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to update check-in");
        // Revert optimistic state on failure
        setLocalCheckedIn(checkedIn);
      } else {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update check-in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={localCheckedIn ? "secondary" : "primary"}
      onClick={handleToggle}
      disabled={loading}
      data-testid={testId ?? "admin-checkin-btn"}
    >
      {loading ? "…" : localCheckedIn ? "Undo check-in" : "Check-in"}
    </Button>
  );
}
