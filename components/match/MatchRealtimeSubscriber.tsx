"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEventRealtime } from "@/lib/realtime/useEventRealtime";

type Props = { eventId: string };

export function MatchRealtimeSubscriber({ eventId }: Props) {
  const router = useRouter();
  const handleUpdate = useCallback(() => router.refresh(), [router]);
  useEventRealtime(eventId, handleUpdate);
  return null;
}
