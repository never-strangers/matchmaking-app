import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

type DbEvent = {
  id: string;
  title: string;
  status: string;
  city?: string | null;
};

type EventsPageData = {
  events: Array<
    DbEvent & {
      joined: boolean;
      answerCount: number;
      totalQuestions: number;
      completed: boolean;
    }
  >;
  isAdmin: boolean;
};

async function getEventsPageData(profileId: string, role: string): Promise<EventsPageData> {
  const supabase = getServiceSupabaseClient();

  let userCity: string | null = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("city")
    .eq("id", profileId)
    .maybeSingle();
  if (profile?.city) userCity = profile.city;

  let events: DbEvent[] | null = null;
  let error: unknown = null;

  if (userCity) {
    const res = await supabase
      .from("events")
      .select("id, title, status, city")
      .eq("status", "live")
      .or(`city.eq.${userCity},city.is.null`)
      .order("created_at", { ascending: true });
    events = res.data;
    error = res.error;
    if (error && ((error as { message?: string }).message?.includes("column"))) {
      error = null;
      const fallback = await supabase
        .from("events")
        .select("id, title, status")
        .eq("status", "live")
        .order("created_at", { ascending: true });
      events = fallback.data;
      error = fallback.error;
    }
  } else {
    const res = await supabase
      .from("events")
      .select("id, title, status, city")
      .eq("status", "live")
      .order("created_at", { ascending: true });
    events = res.data;
    error = res.error;
    if (error && ((error as { message?: string }).message?.includes("column"))) {
      const fallback = await supabase
        .from("events")
        .select("id, title, status")
        .eq("status", "live")
        .order("created_at", { ascending: true });
      events = fallback.data;
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
    .select("event_id")
    .eq("profile_id", profileId)
    .in("event_id", eventIds);

  const joinedSet = new Set<string>(
    (attendeeRows || []).map((r: any) => String(r.event_id))
  );

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

  const enrichedEvents = baseEvents.map((e) => {
    const id = String(e.id);
    const totalQuestions = questionCountByEvent[id] || 0;
    const answerCount = answerCountByEvent[id] || 0;
    const joined = joinedSet.has(id);
    const completed =
      joined && totalQuestions > 0 && answerCount >= totalQuestions;

    return {
      ...e,
      joined,
      answerCount,
      totalQuestions,
      completed,
    };
  });

  return {
    events: enrichedEvents,
    isAdmin: role === "admin",
  };
}

export default async function EventsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) {
    redirect("/");
  }

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

      {events.length === 0 ? (
        <EmptyState
          title="No events available"
          description="Check back soon for upcoming gatherings in your city."
        />
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const { joined, completed, answerCount, totalQuestions } = event;

            let primaryLabel = "Enter Event";
            let primaryHref = `/events/${event.id}/questions`;

            if (joined && !completed) {
              primaryLabel = "Complete Questions";
            } else if (joined && completed) {
              primaryLabel = "View Introductions";
              primaryHref = "/match";
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
                      Live event
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {joined && <Badge variant="success">Joined</Badge>}
                      {completed && (
                        <Badge variant="info">Questionnaire Complete</Badge>
                      )}
                      {joined && !completed && totalQuestions > 0 && (
                        <Badge variant="warning">
                          {answerCount}/{totalQuestions} answered
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:ml-4">
                    <Link href={primaryHref}>
                      <Button size="md">{primaryLabel}</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
