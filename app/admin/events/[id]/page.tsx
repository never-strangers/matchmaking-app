import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminEventsClient, type AdminEventSummary } from "@/app/admin/AdminEventsClient";
import { getAttendeesByEvent } from "@/lib/admin/getAttendeesByEvent";

type MatchRowData = {
  aProfileId: string;
  bProfileId: string;
  aName: string;
  bName: string;
  score: number;
};

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/events");

  const supabase = getServiceSupabaseClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, status, created_at, start_at")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    notFound();
  }

  const [attendeesRes, matchRowsRes] = await Promise.all([
    getAttendeesByEvent(supabase, [eventId]),
    supabase
      .from("match_results")
      .select("a_profile_id, b_profile_id, score")
      .eq("event_id", eventId)
      .order("score", { ascending: false }),
  ]);

  const attendees = attendeesRes[eventId] || [];
  const matchRows = matchRowsRes.data || [];

  const profileIds = new Set<string>();
  matchRows.forEach((r: { a_profile_id: string; b_profile_id: string }) => {
    profileIds.add(r.a_profile_id);
    profileIds.add(r.b_profile_id);
  });

  let profileMap = new Map<string, string>();
  if (profileIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", [...profileIds]);
    (profiles || []).forEach((p: { id: string; display_name: string | null }) => {
      profileMap.set(p.id, p.display_name || p.id.slice(0, 8));
    });
  }

  const matches: MatchRowData[] = matchRows.map(
    (r: { a_profile_id: string; b_profile_id: string; score: number }) => ({
      aProfileId: r.a_profile_id,
      bProfileId: r.b_profile_id,
      aName: profileMap.get(r.a_profile_id) || r.a_profile_id.slice(0, 8),
      bName: profileMap.get(r.b_profile_id) || r.b_profile_id.slice(0, 8),
      score: Number(r.score),
    })
  );

  const eventSummary: AdminEventSummary = {
    id: String(event.id),
    title: event.title,
    status: event.status,
    lastRunStatus: null,
    lastRunAt: null,
    matchCount: matches.length,
  };

  const sortDate = event.start_at || event.created_at;
  const dateLabel = sortDate
    ? new Date(sortDate).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link
          href="/admin/events"
          className="text-sm hover:underline py-2 inline-block touch-manipulation"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Events
        </Link>
      </div>
      <PageHeader
        title={event.title}
        subtitle={`${dateLabel} · ${event.status}`}
      />

      <div className="space-y-6">
        <AdminEventsClient events={[eventSummary]} showCreateButton={false} />

        <Card padding="lg">
          <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
            Attendees
          </h3>
          {attendees.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No one has joined this event yet.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1 sm:mx-0" style={{ minHeight: "1px" }}>
              <table className="w-full text-sm min-w-[280px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    <th className="text-left py-2 pr-2 sm:pr-4 font-medium">Name</th>
                    <th className="text-left py-2 pr-2 sm:pr-4 font-medium">Phone</th>
                    <th className="text-left py-2 pr-2 sm:pr-4 font-medium">Joined</th>
                    <th className="text-left py-2 font-medium">Questions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a) => (
                    <tr key={a.profileId} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="py-2 pr-2 sm:pr-4" style={{ color: "var(--text)" }}>
                        {a.displayName}
                      </td>
                      <td className="py-2 pr-2 sm:pr-4 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                        {a.phoneLast4}
                      </td>
                      <td className="py-2 pr-2 sm:pr-4 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        {a.joinedAt
                          ? new Date(a.joinedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-2" style={{ color: "var(--text)" }}>
                        {a.totalQuestions > 0 ? (
                          <span className={a.answersCount >= a.totalQuestions ? "text-green-600" : ""}>
                            {a.answersCount}/{a.totalQuestions}
                            {a.answersCount >= a.totalQuestions ? " ✓" : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
              Matches
            </h3>
            <Link
              href={`/admin/matches?event=${encodeURIComponent(eventId)}`}
              className="text-sm hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              View all matches →
            </Link>
          </div>
          {matches.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No match results yet. Run matching above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-beige-frame text-left text-gray-medium">
                    <th className="py-2 pr-4 font-medium">Person A</th>
                    <th className="py-2 pr-4 font-medium">Person B</th>
                    <th className="py-2 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.slice(0, 10).map((m, idx) => (
                    <tr
                      key={`${m.aProfileId}-${m.bProfileId}-${idx}`}
                      className="border-b border-beige-frame last:border-0"
                    >
                      <td className="py-2 pr-4 text-gray-dark">{m.aName}</td>
                      <td className="py-2 pr-4 text-gray-dark">{m.bName}</td>
                      <td className="py-2 font-medium text-gray-dark">{m.score.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {matches.length > 10 && (
                <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
                  Showing first 10 of {matches.length}.{" "}
                  <Link
                    href={`/admin/matches?event=${encodeURIComponent(eventId)}`}
                    className="hover:underline"
                  >
                    View all
                  </Link>
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
