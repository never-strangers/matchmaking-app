import Link from "next/link";
import { requireApprovedUser } from "@/lib/auth/requireApprovedUser";
import { getCityConfig } from "@/lib/cities/getCityConfig";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EventsListClient } from "@/app/events/EventsListClient";

type DbEvent = {
  id: string;
  title: string;
  status: string;
  city?: string | null;
  category?: string | null;
  created_at?: string | null;
  start_at?: string | null;
  poster_path?: string | null;
};

type EventsPageData = {
  events: Array<
    DbEvent & {
      joined: boolean;
      answerCount: number;
      totalQuestions: number;
      completed: boolean;
      matchesRun: boolean;
      paymentStatus: string;
      paymentRequired: boolean;
      paid: boolean;
      checkedIn: boolean;
      hasRevealedMatches: boolean;
    }
  >;
  isAdmin: boolean;
  userCity: string | null;
  availableCities: string[];
};

async function getEventsPageData(
  profileId: string,
  role: string,
): Promise<EventsPageData> {
  const supabase = getServiceSupabaseClient();
  const now = new Date().toISOString();

  let userCity: string | null = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("city, invited_user_id")
    .eq("id", profileId)
    .maybeSingle();
  if (profile?.city) {
    userCity = profile.city;
  } else if (profile?.invited_user_id) {
    const { data: invited } = await supabase
      .from("invited_users")
      .select("city")
      .eq("id", profile.invited_user_id)
      .maybeSingle();
    if (invited?.city) userCity = invited.city;
  }

  const [cityConfig, res] = await Promise.all([
    getCityConfig(),
    supabase
      .from("events")
      .select(
        "id, title, status, city, category, created_at, start_at, payment_required, price_cents, poster_path"
      )
      .eq("status", "live")
      .is("deleted_at", null)
      .order("start_at", { ascending: true, nullsFirst: false }),
  ]);

  const liveCityLabels = cityConfig.live.map((c) => c.label);

  const mergeAvailableCities = (citiesInEvents: string[]): string[] => {
    const liveSet = new Set(liveCityLabels);
    const extras = citiesInEvents.filter((c) => Boolean(c) && !liveSet.has(c));
    return [...liveCityLabels, ...extras];
  };

  // Fetch ALL live events
  let events: (DbEvent & { payment_required?: boolean; price_cents?: number })[] | null = null;
  let error: unknown = null;

  events = res.data;
  error = res.error;

  if (error && (error as { message?: string }).message?.includes("column")) {
    error = null;
    const fallback = await supabase
      .from("events")
      .select("id, title, status, created_at")
      .eq("status", "live")
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    events = fallback.data as typeof events;
    error = fallback.error;
  }

  if (error) {
    console.error("Error loading events:", error);
    return {
      events: [],
      isAdmin: role === "admin",
      userCity,
      availableCities: liveCityLabels,
    };
  }

  const baseEvents: DbEvent[] = events || [];
  const eventIds = baseEvents.map((e) => e.id);

  if (eventIds.length === 0) {
    return {
      events: [],
      isAdmin: role === "admin",
      userCity,
      availableCities: liveCityLabels,
    };
  }

  const citiesInEvents = [...new Set(baseEvents.map((e) => e.city).filter(Boolean) as string[])];
  const availableCities = mergeAvailableCities(citiesInEvents);

  // Attendees: payment_status + checked_in
  const { data: attendeeRows } = await supabase
    .from("event_attendees")
    .select("event_id, payment_status, checked_in")
    .eq("profile_id", profileId)
    .in("event_id", eventIds);

  const joinedSet = new Set<string>();
  const paymentStatusByEvent: Record<string, string> = {};
  const checkedInByEvent: Record<string, boolean> = {};
  (attendeeRows || []).forEach((r: any) => {
    const id = String(r.event_id);
    joinedSet.add(id);
    paymentStatusByEvent[id] = r.payment_status ?? "unpaid";
    checkedInByEvent[id] = r.checked_in ?? false;
  });

  // Answers per event for this profile (count rows)
  const { data: answerRows } = await supabase
    .from("answers")
    .select("event_id")
    .eq("profile_id", profileId)
    .in("event_id", eventIds);

  const answerCountByEvent: Record<string, number> = {};
  (answerRows || []).forEach((row: any) => {
    const id = String(row.event_id);
    answerCountByEvent[id] = (answerCountByEvent[id] || 0) + 1;
  });

  // ── Question counts: prefer event_questions (new), fall back to questions (legacy) ──
  // Step 1: query event_questions
  const { data: eqRows } = await supabase
    .from("event_questions")
    .select("event_id, id")
    .in("event_id", eventIds);

  const eqCountByEvent: Record<string, number> = {};
  (eqRows || []).forEach((row: any) => {
    const id = String(row.event_id);
    eqCountByEvent[id] = (eqCountByEvent[id] || 0) + 1;
  });

  // Step 2: legacy questions only for events not covered by event_questions
  const legacyIds = eventIds.filter((id) => !eqCountByEvent[id]);
  const legacyQCountByEvent: Record<string, number> = {};
  if (legacyIds.length > 0) {
    const { data: legacyQRows } = await supabase
      .from("questions")
      .select("event_id, id")
      .in("event_id", legacyIds);
    (legacyQRows || []).forEach((row: any) => {
      const id = String(row.event_id);
      legacyQCountByEvent[id] = (legacyQCountByEvent[id] || 0) + 1;
    });
  }

  const questionCountByEvent: Record<string, number> = {
    ...legacyQCountByEvent,
    ...eqCountByEvent,
  };

  // Match runs
  const { data: runRows } = await supabase
    .from("match_runs")
    .select("event_id")
    .in("event_id", eventIds)
    .eq("status", "done");

  const matchesRunSet = new Set<string>(
    (runRows || []).map((r: any) => String(r.event_id))
  );

  // Reveal state: check match_rounds (source of truth for revealed rounds)
  const eventsWithRun = eventIds.filter((id) => matchesRunSet.has(id));
  const hasRevealedMatchesByEvent: Record<string, boolean> = {};
  if (eventsWithRun.length > 0) {
    const { data: roundRows } = await supabase
      .from("match_rounds")
      .select("event_id, last_revealed_round")
      .in("event_id", eventsWithRun);

    if (roundRows) {
      roundRows.forEach((r: { event_id: string; last_revealed_round: number }) => {
        if (Number(r.last_revealed_round) > 0) {
          hasRevealedMatchesByEvent[String(r.event_id)] = true;
        }
      });
    }
  }

  const enrichedEvents = baseEvents.map((e) => {
    const id = String(e.id);
    const totalQuestions = questionCountByEvent[id] || 0;
    const answerCount = answerCountByEvent[id] || 0;
    const joined = joinedSet.has(id);
    const completed =
      joined && totalQuestions > 0 && answerCount >= totalQuestions;
    const matchesRun = matchesRunSet.has(id);
    const paymentStatus = paymentStatusByEvent[id] ?? "unpaid";
    const priceCents = Number((e as { price_cents?: number }).price_cents ?? 0);
    const paymentRequired =
      (e as { payment_required?: boolean }).payment_required !== false &&
      priceCents > 0;
    const paid =
      paymentStatus === "paid" ||
      paymentStatus === "free" ||
      paymentStatus === "not_required";
    const checkedIn = checkedInByEvent[id] ?? false;
    const hasRevealedMatches = hasRevealedMatchesByEvent[id] ?? false;

    if (process.env.NODE_ENV !== "production" && joined) {
      console.log(
        `[events/page] event=${id} totalQ=${totalQuestions} answers=${answerCount} ` +
        `completed=${completed} checkedIn=${checkedIn} matchesRun=${matchesRun} revealed=${hasRevealedMatches}`
      );
    }

    return {
      ...e,
      joined,
      answerCount,
      totalQuestions,
      completed,
      matchesRun,
      paymentStatus,
      paymentRequired,
      paid,
      checkedIn,
      hasRevealedMatches,
      posterUrl: (e as { poster_path?: string | null }).poster_path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-posters/${(e as { poster_path: string }).poster_path}`
        : null,
    };
  });

  const futureEvents = enrichedEvents.filter((event) => {
    const sortDate = (event.start_at || event.created_at || now) as string;
    return sortDate >= now;
  });

  return {
    events: futureEvents,
    isAdmin: role === "admin",
    userCity,
    availableCities,
  };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireApprovedUser();

  const { events, isAdmin, userCity, availableCities } = await getEventsPageData(
    session.profile_id,
    session.role
  );

  const resolvedParams = await searchParams;
  const initialCity = (resolvedParams.city as string | undefined) ?? null;
  const initialCategory = (resolvedParams.category as string | undefined) ?? null;

  return (
    <div
      className="max-w-5xl mx-auto px-4 py-8 sm:py-12 overflow-visible"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <PageHeader
        title="Upcoming Events"
        subtitle="Join curated gatherings in your city"
        action={
          isAdmin ? (
            <Link href="/admin">
              <Button variant="secondary" size="md">
                Admin Dashboard
              </Button>
            </Link>
          ) : undefined
        }
      />
      <h2 className="sr-only" data-testid="events-headline">
        Upcoming Events
      </h2>

      <EventsListClient
        events={events}
        availableCities={availableCities}
        userCity={userCity}
        initialCity={initialCity}
        initialCategory={initialCategory}
      />
    </div>
  );
}
