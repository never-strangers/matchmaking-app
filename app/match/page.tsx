import Link from "next/link";
import { requireApprovedUser } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { MatchRealtimeSubscriber } from "@/components/match/MatchRealtimeSubscriber";
import { MatchRevealView } from "@/components/match/MatchRevealView";
import { EventSelectorClient } from "@/components/match/EventSelectorClient";
import type { MatchEventItem } from "@/app/api/match/events/route";

type MatchPageProps = {
  searchParams?: Promise<{ event?: string }>;
};

export default async function MatchPage(props: MatchPageProps) {
  const session = await requireApprovedUser();
  const searchParams = await props.searchParams;
  const requestedEventId = searchParams?.event?.trim() || null;

  const supabase = getServiceSupabaseClient();

  // 1. Fetch all events the user has joined
  const { data: attendeeRows } = await supabase
    .from("event_attendees")
    .select("event_id, payment_status")
    .eq("profile_id", session.profile_id);

  if (!attendeeRows || attendeeRows.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <PageHeader
          title="Your Matches"
          subtitle="Join an event to see your matches."
        />
        <h2 className="sr-only" data-testid="matches-headline">
          Your Matches
        </h2>
        <Card padding="lg">
          <EmptyState
            title="No events yet"
            description="Find an upcoming event in your city to get started."
            action={
              <Link
                href="/events"
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--primary)" }}
              >
                Browse Events →
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  // 2. Fetch event details + match state in parallel
  const eventIds = (attendeeRows as { event_id: string }[]).map((r) =>
    String(r.event_id)
  );

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
    (attendeeRows as { event_id: string; payment_status: string }[]).map(
      (r) => [String(r.event_id), r.payment_status]
    )
  );
  const revealedRoundByEvent = new Map(
    (roundRows || []).map(
      (r: { event_id: string; last_revealed_round: number }) => [
        String(r.event_id),
        Number(r.last_revealed_round),
      ]
    )
  );

  // 3. Build event options (ordered by start_at DESC — already ordered from query)
  const events: MatchEventItem[] = (eventRows || []).map(
    (ev: {
      id: string;
      title: string;
      start_at: string;
      city: string;
      category: string;
      payment_required: boolean | null;
    }) => {
      const paymentStatus =
        paymentStatusByEvent.get(String(ev.id)) ?? "unknown";
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
    }
  );

  // 4. Smart default selection
  // Priority: (a) ?event= deep link, (b) most recent event with revealed matches,
  // (c) most recent eligible event, (d) most recent attended event
  let selectedId: string | null = null;

  if (requestedEventId && events.find((e) => e.id === requestedEventId)) {
    selectedId = requestedEventId;
  } else {
    const withRevealed = events.find((e) => e.hasRevealedMatches && e.isEligible);
    const anyEligible = events.find((e) => e.isEligible);
    selectedId =
      withRevealed?.id ?? anyEligible?.id ?? events[0]?.id ?? null;
  }

  const selectedEvent = events.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <PageHeader
        title="Your Matches"
        subtitle={
          selectedEvent
            ? `Matches for ${selectedEvent.title}`
            : "Your Matches"
        }
      />
      <h2 className="sr-only" data-testid="matches-headline">
        Your Matches
      </h2>

      {events.length > 1 && (
        <EventSelectorClient events={events} selectedId={selectedId} />
      )}

      {!selectedId || !selectedEvent ? (
        <Card padding="lg">
          <EmptyState
            title="No matches yet"
            description="Join an event and complete the questionnaire to see your matches."
            action={
              <Link
                href="/events"
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--primary)" }}
              >
                Browse Events →
              </Link>
            }
          />
        </Card>
      ) : !selectedEvent.isEligible ? (
        <Card padding="lg">
          <EmptyState
            title="Payment required"
            description="Complete your payment to unlock matches for this event."
            action={
              <Link
                href="/events"
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--primary)" }}
              >
                Go to Events →
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <MatchRealtimeSubscriber eventId={selectedId} />
          <MatchRevealView
            eventId={selectedId}
            eventTitle={selectedEvent.title}
          />
        </>
      )}

      <div className="mt-8">
        <Link
          href="/events"
          className="text-sm hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Events
        </Link>
      </div>
    </div>
  );
}
