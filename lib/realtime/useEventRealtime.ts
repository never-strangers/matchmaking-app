"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Subscribe to match_runs, match_results, and likes for an event.
 * Calls onUpdate when any of these tables change for the given event_id.
 */
export function useEventRealtime(eventId: string, onUpdate: () => void) {
  useEffect(() => {
    if (!eventId) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_runs",
          filter: `event_id=eq.${eventId}`,
        },
        () => onUpdate()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_results",
          filter: `event_id=eq.${eventId}`,
        },
        () => onUpdate()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "likes",
          filter: `event_id=eq.${eventId}`,
        },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, onUpdate]);
}

/**
 * Subscribe to match_runs and match_results (all events).
 * Use on admin dashboard to refresh when matching runs complete.
 */
export function useAdminRealtime(onUpdate: () => void) {
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_runs",
        },
        () => onUpdate()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_results",
        },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
