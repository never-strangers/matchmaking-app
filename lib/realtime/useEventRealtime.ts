"use client";

import { useEffect, useRef, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 1500;

function useDebouncedCallback(callback: () => void, delay: number) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  callbackRef.current = callback;

  const debounced = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      callbackRef.current();
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return debounced;
}

/**
 * Subscribe to match_runs, match_results, and likes for an event.
 * Calls onUpdate (debounced) when any of these tables change for the given event_id.
 */
export function useEventRealtime(eventId: string, onUpdate: () => void) {
  const debouncedUpdate = useDebouncedCallback(onUpdate, DEBOUNCE_MS);

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
        () => debouncedUpdate()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_results",
          filter: `event_id=eq.${eventId}`,
        },
        () => debouncedUpdate()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "likes",
          filter: `event_id=eq.${eventId}`,
        },
        () => debouncedUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, debouncedUpdate]);
}

/**
 * Subscribe to match_runs and match_results (all events).
 * Use on admin dashboard to refresh when matching runs complete.
 */
export function useAdminRealtime(onUpdate: () => void) {
  const debouncedUpdate = useDebouncedCallback(onUpdate, DEBOUNCE_MS);

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
        () => debouncedUpdate()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_results",
        },
        () => debouncedUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [debouncedUpdate]);
}
