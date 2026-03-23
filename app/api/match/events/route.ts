import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export type MatchEventItem = {
  id: string;
  title: string;
  start_at: string;
  city: string;
  category: "friends" | "dating";
  poster_url: string | null;
  hasRevealedMatches: boolean;
  revealedCount: number;
  paymentStatus: string;
  isEligible: boolean;
};

export type MatchEventsResponse = { events: MatchEventItem[] };

export async function GET(_req: NextRequest) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const supabase = getServiceSupabaseClient();

  const { data: attendeeRows } = await supabase
    .from("event_attendees")
    .select("event_id, payment_status")
    .eq("profile_id", auth.profile_id);

  if (!attendeeRows || attendeeRows.length === 0) {
    return Response.json({ events: [] } satisfies MatchEventsResponse);
  }

  const eventIds = (attendeeRows as { event_id: string }[]).map((r) => String(r.event_id));

  const [{ data: eventRows }, { data: roundRows }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, start_at, city, category, payment_required")
      .in("id", eventIds)
      .order("start_at", { ascending: false }),
    supabase
      .from("match_rounds")
      .select("event_id, last_revealed_round")
      .in("event_id", eventIds),
  ]);

  const paymentStatusByEvent = new Map(
    (attendeeRows as { event_id: string; payment_status: string }[]).map((r) => [
      String(r.event_id),
      r.payment_status,
    ])
  );
  const revealedRoundByEvent = new Map(
    (roundRows || []).map((r: { event_id: string; last_revealed_round: number }) => [
      String(r.event_id),
      Number(r.last_revealed_round),
    ])
  );

  const events: MatchEventItem[] = (eventRows || []).map((ev: {
    id: string; title: string; start_at: string; city: string;
    category: string; payment_required: boolean | null;
  }) => {
    const paymentStatus = paymentStatusByEvent.get(String(ev.id)) ?? "unknown";
    const paymentRequired = ev.payment_required !== false;
    const isPaid =
      paymentStatus === "paid" ||
      paymentStatus === "free" ||
      paymentStatus === "not_required";
    const isEligible = !paymentRequired || isPaid;
    const lastRevealedRound = revealedRoundByEvent.get(String(ev.id)) ?? 0;
    return {
      id: String(ev.id),
      title: ev.title,
      start_at: ev.start_at,
      city: ev.city,
      category: ev.category as "friends" | "dating",
      poster_url: null,
      hasRevealedMatches: lastRevealedRound > 0,
      revealedCount: lastRevealedRound,
      paymentStatus,
      isEligible,
    };
  });

  return Response.json({ events } satisfies MatchEventsResponse);
}
