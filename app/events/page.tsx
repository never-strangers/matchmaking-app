import Link from "next/link";
import { requireApprovedUser } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { cityForFilter } from "@/lib/constants/profileOptions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PayToConfirmButton } from "@/app/events/PayToConfirmButton";

type DbEvent = {
  id: string;
  title: string;
  status: string;
  city?: string | null;
  created_at?: string | null;
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
      canViewMatches: boolean;
    }
  >;
  isAdmin: boolean;
};

async function getEventsPageData(profileId: string, role: string): Promise<EventsPageData> {
  const supabase = getServiceSupabaseClient();

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

  // Normalize so "sg" matches events stored as "Singapore" (and vice versa)
  const filterCity = userCity ? cityForFilter(userCity) : null;

  let events: (DbEvent & { payment_required?: boolean; price_cents?: number })[] | null = null;
  let error: unknown = null;

  if (filterCity) {
    const res = await supabase
      .from("events")
      .select("id, title, status, city, created_at, payment_required, price_cents")
      .eq("status", "live")
      .or(`city.eq.${filterCity},city.is.null`)
      .order("created_at", { ascending: true });
    events = res.data;
    error = res.error;
    if (error && ((error as { message?: string }).message?.includes("column"))) {
      error = null;
      const fallback = await supabase
        .from("events")
        .select("id, title, status, created_at")
        .eq("status", "live")
        .order("created_at", { ascending: true });
      events = fallback.data as typeof events;
      error = fallback.error;
    }
  } else {
    const res = await supabase
      .from("events")
      .select("id, title, status, city, created_at, payment_required, price_cents")
      .eq("status", "live")
      .order("created_at", { ascending: true });
    events = res.data;
    error = res.error;
    if (error && ((error as { message?: string }).message?.includes("column"))) {
      const fallback = await supabase
        .from("events")
        .select("id, title, status, created_at")
        .eq("status", "live")
        .order("created_at", { ascending: true });
      events = fallback.data as typeof events;
      error = fallback.error;
    }
  }

  if (error) {
    console.error("Error loading events:", error);
    return { events: [], isAdmin: role === "admin" };
  }

  const baseEvents: DbEvent[] = events || [];
  const eventIds = baseEvents.map((e) => e.id);

  if (eventIds.length === 0) {
    return { events: [], isAdmin: role === "admin" };
  }

  // Which events has this user joined?
  const { data: attendeeRows } = await supabase
    .from("event_attendees")
    .select("event_id, payment_status")
    .eq("profile_id", profileId)
    .in("event_id", eventIds);

  const joinedSet = new Set<string>(
    (attendeeRows || []).map((r: any) => String(r.event_id))
  );
  const paymentStatusByEvent: Record<string, string> = {};
  (attendeeRows || []).forEach((r: any) => {
    paymentStatusByEvent[String(r.event_id)] = r.payment_status ?? "unpaid";
  });

  // Answers per event for this profile
  const { data: answerRows } = await supabase
    .from("answers")
    .select("event_id, question_id")
    .eq("profile_id", profileId)
    .in("event_id", eventIds);

  const answerCountByEvent: Record<string, number> = {};
  (answerRows || []).forEach((row: any) => {
    const id = String(row.event_id);
    answerCountByEvent[id] = (answerCountByEvent[id] || 0) + 1;
  });

  // Question counts per event
  const { data: questionRows } = await supabase
    .from("questions")
    .select("event_id, id")
    .in("event_id", eventIds);

  const questionCountByEvent: Record<string, number> = {};
  (questionRows || []).forEach((row: any) => {
    const id = String(row.event_id);
    questionCountByEvent[id] = (questionCountByEvent[id] || 0) + 1;
  });

  // Events for which admin has run matching (match_runs with status = 'done')
  const { data: runRows } = await supabase
    .from("match_runs")
    .select("event_id")
    .in("event_id", eventIds)
    .eq("status", "done");

  const matchesRunSet = new Set<string>(
    (runRows || []).map((r: any) => String(r.event_id))
  );

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
    const paid = paymentStatus === "paid";
    const canViewMatches = matchesRun && (!paymentRequired || paid);

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
      canViewMatches,
    };
  });

  return {
    events: enrichedEvents,
    isAdmin: role === "admin",
  };
}

export default async function EventsPage() {
  const session = await requireApprovedUser();

  const { events, isAdmin } = await getEventsPageData(
    session.profile_id,
    session.role
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
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

      {events.length === 0 ? (
        <EmptyState
          title="No events available"
          description="Check back soon for upcoming gatherings in your city."
        />
      ) : (
        <div className="space-y-4" data-testid="events-list-container">
          {events.map((event) => {
            const { joined, completed, answerCount, totalQuestions, matchesRun, paymentRequired, paid, canViewMatches } = event;

            let primaryLabel = "Enter Event";
            let primaryHref = `/events/${event.id}/questions`;
            let showPrimary = true;

            if (joined && !completed) {
              primaryLabel = "Complete Questions";
            } else if (joined && completed && paymentRequired && !paid) {
              primaryLabel = "Pay to confirm";
              primaryHref = ""; // use PayToConfirmButton instead of link
            } else if (joined && completed) {
              if (canViewMatches) {
                primaryLabel = "View Matches";
                primaryHref = "/match";
              } else {
                primaryLabel = "Matches pending";
                primaryHref = "#";
                showPrimary = false;
              }
            }

            return (
              <Card key={event.id} variant="elevated" padding="md">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1">
                    <h2
                      className="text-xl font-semibold mb-2"
                      style={{ color: "var(--text)" }}
                    >
                      {event.title}
                    </h2>
                    <p
                      className="text-sm mb-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {event.created_at
                        ? (() => {
                            const d = new Date(event.created_at);
                            const today = new Date();
                            const isToday =
                              d.getDate() === today.getDate() &&
                              d.getMonth() === today.getMonth() &&
                              d.getFullYear() === today.getFullYear();
                            return isToday
                              ? "Today"
                              : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                          })()
                        : "Live event"}
                      {event.created_at ? " · Live event" : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {joined && <Badge variant="success">Joined</Badge>}
                      {completed && (
                        <Badge variant="info">Questionnaire Complete</Badge>
                      )}
                      {joined && completed && paymentRequired && paid && (
                        <Badge variant="success">Paid</Badge>
                      )}
                      {joined && !completed && totalQuestions > 0 && (
                        <Badge variant="warning">
                          {answerCount}/{totalQuestions} answered
                        </Badge>
                      )}
                      {joined && completed && !matchesRun && (
                        <Badge variant="warning">Matches pending</Badge>
                      )}
                    </div>
                    {joined && completed && !matchesRun && (
                      <p
                        className="text-sm mt-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Matches will appear after the host runs matching.
                      </p>
                    )}
                  </div>
                  {showPrimary && (
                    <div className="flex flex-col sm:flex-row gap-2 sm:ml-4">
                      {primaryLabel === "Pay to confirm" ? (
                        <PayToConfirmButton eventId={event.id} />
                      ) : (
                        <Link href={primaryHref}>
                          <Button size="md">{primaryLabel}</Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
