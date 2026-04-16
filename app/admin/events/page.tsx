import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { formatDateLabel } from "@/lib/time/formatEventTime";
import { AdminEventRow, DeletedEventRow } from "./AdminEventRows";

const RECOVERY_DAYS = 30;

type DbEvent = {
  id: string;
  title: string;
  status: string;
  created_at: string | null;
  start_at?: string | null;
  deleted_at?: string | null;
};

type EventsListData = {
  totalEvents: number;
  totalAttendees: number;
  totalMatches: number;
  upcoming: DbEvent[];
  past: DbEvent[];
  trash: DbEvent[];
};

async function getEventsListData(
  supabase: ReturnType<typeof getServiceSupabaseClient>
): Promise<EventsListData> {
  const now = new Date().toISOString();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECOVERY_DAYS);
  const cutoffIso = cutoff.toISOString();

  // Active events
  const { data: activeData, error: activeErr } = await supabase
    .from("events")
    .select("id, title, status, created_at, start_at, deleted_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  // Deleted events still within 30-day recovery window
  const { data: trashData } = await supabase
    .from("events")
    .select("id, title, status, created_at, start_at, deleted_at")
    .not("deleted_at", "is", null)
    .gte("deleted_at", cutoffIso)
    .order("deleted_at", { ascending: false });

  let events: DbEvent[] = [];

  if (activeErr) {
    // Fallback: column may not exist yet (migration not applied)
    const fallback = await supabase
      .from("events")
      .select("id, title, status, created_at")
      .order("created_at", { ascending: true });
    events = ((fallback.data || []) as DbEvent[]).map((e) => ({ ...e, start_at: null, deleted_at: null }));
  } else {
    events = (activeData || []) as DbEvent[];
  }

  const trash = (trashData || []) as DbEvent[];
  const eventIds = events.map((e) => e.id);

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
  const upcoming = events
    .filter((e) => sortDate(e) >= now)
    .sort((a, b) => sortDate(a).localeCompare(sortDate(b)));
  const past = events
    .filter((e) => sortDate(e) < now)
    .sort((a, b) => sortDate(b).localeCompare(sortDate(a)));

  return { totalEvents: events.length, totalAttendees, totalMatches, upcoming, past, trash };
}

export default async function AdminEventsPage() {
  const session = await getAuthUser();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/events");

  const supabase = getServiceSupabaseClient();
  const { totalEvents, totalAttendees, totalMatches, upcoming, past, trash } =
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card padding="md">
          <p className="text-2xl font-semibold" style={{ color: "var(--text)" }}>{totalEvents}</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Total Events</p>
        </Card>
        <Card padding="md">
          <p className="text-2xl font-semibold" style={{ color: "var(--text)" }}>{totalAttendees}</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Total Attendees</p>
        </Card>
        <Card padding="md">
          <p className="text-2xl font-semibold" style={{ color: "var(--text)" }}>{totalMatches}</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Total Matches</p>
        </Card>
      </div>

      {totalEvents === 0 && trash.length === 0 ? (
        <Card padding="lg">
          <p style={{ color: "var(--text-muted)" }}>
            No events found. Create an event to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <Card padding="lg">
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>
                Upcoming Events
              </h2>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {upcoming.map((event) => (
                  <AdminEventRow
                    key={event.id}
                    event={{
                      id: event.id,
                      title: event.title,
                      dateLabel: formatDateLabel(event.start_at || event.created_at),
                    }}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Past */}
          {past.length > 0 && (
            <Card padding="lg">
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>
                Past Events
              </h2>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {past.map((event) => (
                  <AdminEventRow
                    key={event.id}
                    event={{
                      id: event.id,
                      title: event.title,
                      dateLabel: formatDateLabel(event.start_at || event.created_at),
                    }}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Trash — deleted events within 30-day recovery window */}
          {trash.length > 0 && (
            <Card padding="lg">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold" style={{ color: "var(--text-muted)" }}>
                  Trash
                </h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}
                >
                  {trash.length}
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Deleted events are recoverable for 30 days, then permanently removed.
              </p>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {trash.map((event) => (
                  <DeletedEventRow
                    key={event.id}
                    event={{
                      id: event.id,
                      title: event.title,
                      dateLabel: formatDateLabel(event.start_at || event.created_at),
                      deleted_at: event.deleted_at,
                    }}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
