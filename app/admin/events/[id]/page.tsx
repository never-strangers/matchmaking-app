import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateLabelLong } from "@/lib/time/formatEventTime";
import { AdminEventsClient, type AdminEventSummary } from "@/app/admin/AdminEventsClient";
import { getAttendeesByEvent } from "@/lib/admin/getAttendeesByEvent";
import { GuestListClient } from "@/components/admin/GuestListClient";
import { MatchRevealControl } from "@/components/admin/MatchRevealControl";
import { AddAttendeePanel } from "@/components/admin/AddAttendeePanel";

type MatchRowData = {
  aProfileId: string;
  bProfileId: string;
  aName: string;
  bName: string;
  score: number;
  matchType: string;
};

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const session = await getAuthUser();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/events");

  const supabase = getServiceSupabaseClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, status, created_at, start_at, end_at, category, poster_path, whats_included, payment_required, price_cents")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    notFound();
  }

  const [attendeesRes, matchRowsRes, matchRoundsRes, roundCountsRes] = await Promise.all([
    getAttendeesByEvent(supabase, [eventId]),
    supabase
      .from("match_results")
      .select("a_profile_id, b_profile_id, score, round, match_type")
      .eq("event_id", eventId)
      .order("score", { ascending: false }),
    supabase
      .from("match_rounds")
      .select("round1_revealed_at, round2_revealed_at, round3_revealed_at, last_revealed_round, last_computed_round")
      .eq("event_id", eventId)
      .maybeSingle(),
    supabase
      .from("match_results")
      .select("round")
      .eq("event_id", eventId),
  ]);

  const allAttendees = attendeesRes[eventId] || [];
  const paymentRequired =
    event &&
    (event as { payment_required?: boolean }).payment_required !== false &&
    Number((event as { price_cents?: number }).price_cents ?? 0) > 0;
  const paidAttendees = paymentRequired
    ? allAttendees.filter(
        (a) =>
          a.paymentStatus === "paid" ||
          a.paymentStatus === "free" ||
          a.paymentStatus === "not_required"
      )
    : allAttendees;
  const pendingAttendees = paymentRequired
    ? allAttendees.filter(
        (a) =>
          a.paymentStatus === "unpaid" ||
          a.paymentStatus === "checkout_created"
      )
    : [];
  const attendees = allAttendees;
  const matchRows = matchRowsRes.data || [];
  const matchRounds = matchRoundsRes.data as {
    round1_revealed_at: string | null;
    round2_revealed_at: string | null;
    round3_revealed_at: string | null;
    last_revealed_round: number;
    last_computed_round?: number;
  } | null;
  const roundCounts = (roundCountsRes.data || []).reduce(
    (acc: Record<number, number>, r: { round: number }) => {
      const n = Number(r.round);
      acc[n] = (acc[n] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

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
    (r: { a_profile_id: string; b_profile_id: string; score: number; match_type?: string | null }) => ({
      aProfileId: r.a_profile_id,
      bProfileId: r.b_profile_id,
      aName: profileMap.get(r.a_profile_id) || r.a_profile_id.slice(0, 8),
      bName: profileMap.get(r.b_profile_id) || r.b_profile_id.slice(0, 8),
      score: Number(r.score),
      matchType: r.match_type ?? 'date',
    })
  );

  const round1Count = roundCounts[1] ?? 0;
  const round2Count = roundCounts[2] ?? 0;
  const round3Count = roundCounts[3] ?? 0;
  const lastRevealedRound = matchRounds?.last_revealed_round ?? 0;
  const lastComputedRound = matchRounds?.last_computed_round ?? 0;

  const eventSummary: AdminEventSummary = {
    id: String(event.id),
    title: event.title,
    status: event.status,
    lastRunStatus: null,
    lastRunAt: null,
    matchCount: matches.length,
  };

  const dateLabel = formatDateLabelLong(event.start_at || event.created_at);

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

      <div className="mb-4 flex gap-4 flex-wrap">
        <Link
          href={`/admin/events/${eventId}/edit`}
          className="text-sm hover:underline py-2 inline-block touch-manipulation"
          style={{ color: "var(--text-muted)" }}
        >
          Edit event →
        </Link>
        <Link
          href={`/admin/events/${eventId}/questions`}
          className="text-sm hover:underline py-2 inline-block touch-manipulation"
          style={{ color: "var(--text-muted)" }}
        >
          Manage Questions →
        </Link>
      </div>

      <div className="space-y-6">
        <AdminEventsClient events={[eventSummary]} showCreateButton={false} />

        <Card padding="lg">
          <h3
            className="text-base font-semibold mb-3"
            style={{ color: "var(--text)" }}
          >
            Live match reveal control
          </h3>
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
            Reveal Round 1, then Round 2, then Round 3. Each round reveals one
            match per attendee (no repeat partners across rounds). Attendees
            see a full-screen countdown before each round’s match.
          </p>
          <MatchRevealControl
            eventId={eventId}
            round1RevealedAt={matchRounds?.round1_revealed_at ?? null}
            round2RevealedAt={matchRounds?.round2_revealed_at ?? null}
            round3RevealedAt={matchRounds?.round3_revealed_at ?? null}
            lastRevealedRound={lastRevealedRound}
            lastComputedRound={lastComputedRound}
            round1Count={round1Count}
            round2Count={round2Count}
            round3Count={round3Count}
          />
        </Card>

        <Card padding="lg">
          <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
            Add attendee
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Search approved users and add them directly to this event.
            {paymentRequired && " Set their payment state (comp/cash or reserved)."}
          </p>
          <AddAttendeePanel eventId={eventId} paymentRequired={!!paymentRequired} />
        </Card>

        <Card padding="lg">
          <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
            Guest list
          </h3>
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
            Only checked-in attendees are included when you run matching. Check in guests who are present.
            {paymentRequired && (
              <> Paid and comped attendees can be checked in.</>
            )}
          </p>
          <GuestListClient
            allAttendees={allAttendees}
            eventId={eventId}
            paymentRequired={!!paymentRequired}
          />
          {paidAttendees.length > 0 && paidAttendees.filter((a) => a.checkedIn).length < 4 && (
            <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>
              Fewer than 4 guests are checked in. Run matching will only include checked-in attendees.
            </p>
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
                    <th className="py-2 pr-4 font-medium">Score</th>
                    <th className="py-2 font-medium">Type</th>
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
                      <td className="py-2 pr-4 font-medium text-gray-dark">{m.score.toFixed(1)}%</td>
                      <td
                        className="py-2 font-medium text-gray-dark"
                        title={m.matchType === "date" ? "Date match" : "Friend fallback"}
                        data-testid="admin-match-type"
                        data-match-type={m.matchType}
                      >
                        {m.matchType === "date" ? "D" : "F"}
                      </td>
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
