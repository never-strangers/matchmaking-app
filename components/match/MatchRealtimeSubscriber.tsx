"use client";

import { useRouter } from "next/navigation";
import { useEventRealtime } from "@/lib/realtime/useEventRealtime";

type Props = { eventId: string };

export function MatchRealtimeSubscriber({ eventId }: Props) {
  const router = useRouter();
  useEventRealtime(eventId, () => router.refresh());
  return null;
}
