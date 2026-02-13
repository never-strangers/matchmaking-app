import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

type DbEvent = {
  id: string;
  title: string;
  status: string;
  created_at: string | null;
  start_at?: string | null;
};

type EventsListData = {
  totalEvents: number;
  totalAttendees: number;
  totalMatches: number;
  upcoming: DbEvent[];
  past: DbEvent[];
};

async function getEventsListData(
  supabase: ReturnType<typeof getServiceSupabaseClient>
): Promise<EventsListData> {
  const now = new Date().toISOString();

  let events: DbEvent[] | null = null;
  let eventsError: unknown = null;

  const res = await supabase
    .from("events")
    .select("id, title, status, created_at, start_at")
    .order("created_at", { ascending: true });
  events = res.data as DbEvent[] | null;
  eventsError = res.error;

  if (eventsError) {
    const fallback = await supabase
      .from("events")
      .select("id, title, status, created_at")
      .order("created_at", { ascending: true });
    events = (fallback.data || []).map((e) => ({ ...e, start_at: null })) as DbEvent[];
    if (fallback.error) {
      console.error("Error loading events:", fallback.error);
      return { totalEvents: 0, totalAttendees: 0, totalMatches: 0, upcoming: [], past: [] };
    }
  }

  const allEvents = (events || []) as DbEvent[];
  const eventIds = allEvents.map((e) => e.id);

  let totalAttendees = 0;
  let totalMatches = 0;

  if (eventIds.length > 0) {
    const [attendeesRes, matchesRes] = await Promise.all([
      supabase.from("event_attendees").select("event_id", { count: "exact", head: true }).in("event_id", eventIds),
      supabase.from("match_results").select("event_id", { count: "exact", head: true }).in("event_id", eventIds),
    ]);

    totalAttendees = attendeesRes.count ?? 0;
    totalMatches = matchesRes.count ?? 0;
  }

  const sortDate = (e: DbEvent) => (e.start_at || e.created_at || now) as string;
  const upcoming = allEvents
    .filter((e) => sortDate(e) >= now)
    .sort((a, b) => sortDate(a).localeCompare(sortDate(b)));
  const past = allEvents
    .filter((e) => sortDate(e) < now)
    .sort((a, b) => sortDate(b).localeCompare(sortDate(a)));

  return {
    totalEvents: allEvents.length,
    totalAttendees,
    totalMatches,
    upcoming,
    past,
  };
}

function formatDateLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export default async function AdminEventsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/events");

  const supabase = getServiceSupabaseClient();
  const { totalEvents, totalAttendees, totalMatches, upcoming, past } =
    await getEventsListData(supabase);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link
          href="/admin"
          className="text-sm hover:underline py-2 inline-block touch-manipulation"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Admin
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <PageHeader
          title="Your Events"
          subtitle="Manage events, attendees, and matching."
        />
        <Link href="/admin/events/new">
          <Button size="sm" data-testid="admin-create-event">
            Create Event
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card padding="md">
          <p className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
            {totalEvents}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Total Events
          </p>
        </Card>
        <Card padding="md">
          <p className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
            {totalAttendees}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Total Attendees
          </p>
        </Card>
        <Card padding="md">
          <p className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
            {totalMatches}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Total Matches
          </p>
        </Card>
      </div>

      {totalEvents === 0 ? (
        <Card padding="lg">
          <p style={{ color: "var(--text-muted)" }}>
            No events found. Create an event to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <Card padding="lg">
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>
                Upcoming Events
              </h2>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {upcoming.map((event) => {
                  const sortDate = event.start_at || event.created_at;
                  return (
                    <Link
                      key={event.id}
                      href={`/admin/events/${event.id}`}
                      className="flex items-center gap-4 py-3 block hover:bg-[var(--bg-muted)]/50 -mx-2 px-2 rounded-lg transition-colors"
                      data-testid={`event-row-${event.id}`}
                    >
                      <span
                        className="text-sm w-14 shrink-0"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDateLabel(sortDate)}
                      </span>
                      <span className="font-medium" style={{ color: "var(--text)" }}>
                        {event.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}

          {past.length > 0 && (
            <Card padding="lg">
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>
                Past Events
              </h2>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {past.map((event) => {
                  const sortDate = event.start_at || event.created_at;
                  return (
                    <Link
                      key={event.id}
                      href={`/admin/events/${event.id}`}
                      className="flex items-center gap-4 py-3 block hover:bg-[var(--bg-muted)]/50 -mx-2 px-2 rounded-lg transition-colors"
                      data-testid={`event-row-${event.id}`}
                    >
                      <span
                        className="text-sm w-14 shrink-0"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDateLabel(sortDate)}
                      </span>
                      <span className="font-medium" style={{ color: "var(--text)" }}>
                        {event.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
