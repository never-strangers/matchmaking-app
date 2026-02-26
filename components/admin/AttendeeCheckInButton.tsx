"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Props = {
  eventId: string;
  attendeeId: string;
  checkedIn: boolean;
};

export function AttendeeCheckInButton({ eventId, attendeeId, checkedIn }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attendee_id: attendeeId, checked_in: !checkedIn }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Failed to update check-in");
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
      variant={checkedIn ? "secondary" : "primary"}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "…" : checkedIn ? "Undo check-in" : "Check-in"}
    </Button>
  );
}
