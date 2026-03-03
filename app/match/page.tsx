import Link from "next/link";
import { requireApprovedUser } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import type {
  QuestionnaireAnswers,
  MatchUser,
  Question,
} from "@/types/questionnaire";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { MatchRealtimeSubscriber } from "@/components/match/MatchRealtimeSubscriber";
import { MatchRevealView } from "@/components/match/MatchRevealView";

type MatchPageProps = {
  searchParams?: Promise<{ event?: string }>;
};

export default async function MatchPage(props: MatchPageProps) {
  const session = await requireApprovedUser();
  const searchParams = await props.searchParams;
  const requestedEventId = searchParams?.event?.trim() || null;

  const supabase = getServiceSupabaseClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, status, payment_required")
    .eq("status", "live")
    .order("created_at", { ascending: true });

  if (!events || events.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <PageHeader
          title="Your Matches"
          subtitle="Join an event first to see your matches."
        />
        <EmptyState
          title="No events available"
          description="Check back soon for upcoming gatherings in your city."
        />
      </div>
    );
  }

  const eventIds = events.map((e) => e.id);
  const { data: attendeeRows } = await supabase
    .from("event_attendees")
    .select("event_id, payment_status")
    .eq("profile_id", session.profile_id)
    .in("event_id", eventIds);

  const paidOrNotRequiredEventIds = eventIds.filter((eid) => {
    const ev = events.find((e) => e.id === eid);
    const paymentRequired = (ev as { payment_required?: boolean })?.payment_required !== false;
    const att = (attendeeRows || []).find((r: { event_id: string }) => String(r.event_id) === String(eid));
    const status = (att as { payment_status?: string })?.payment_status;
    const paid =
      status === "paid" || status === "free" || status === "not_required";
    return att && (!paymentRequired || paid);
  });

  const { data: runRows } = await supabase
    .from("match_runs")
    .select("event_id")
    .in("event_id", paidOrNotRequiredEventIds)
    .eq("status", "done")
    .order("finished_at", { ascending: false });

  const eventsWithRuns = new Set((runRows ?? []).map((r: { event_id: string }) => r.event_id));

  let eventIdWithMatches: string | null = null;
  let event: (typeof events)[0] | null = null;

  if (requestedEventId) {
    const isAttendee = paidOrNotRequiredEventIds.includes(requestedEventId);
    const hasRun = eventsWithRuns.has(requestedEventId);
    const ev = events.find((e) => e.id === requestedEventId);
    if (ev && isAttendee && hasRun) {
      eventIdWithMatches = requestedEventId;
      event = ev;
    }
  }
  if (!event) {
    eventIdWithMatches = runRows?.[0]?.event_id ?? null;
    event = eventIdWithMatches
      ? events.find((e) => e.id === eventIdWithMatches) ?? events[0]
      : events[0];
  }

  if (!eventIdWithMatches) {
    const hasPaidEvent = paidOrNotRequiredEventIds.length > 0;
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <PageHeader
          title="Your Matches"
          subtitle={hasPaidEvent ? "Matches will appear after the host runs matching for your event." : "Join an event and pay to confirm your seat to see matches."}
        />
        <Card padding="lg">
          <EmptyState
            title="No matches yet"
            description={hasPaidEvent ? "Once the host runs matching, your top matches will appear here." : "Complete an event questionnaire and pay to confirm your seat, then matches will appear here after matching is run."}
          />
        </Card>
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

  // Load all answers for this event (event already has match_runs done)
  const { data: answerRows } = await supabase
    .from("answers")
    .select("profile_id, question_id, answer")
    .eq("event_id", event.id);

  if (!answerRows || answerRows.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <PageHeader
          title="Your Matches"
          subtitle="Admin needs to run matching for this event."
        />
        <Card padding="lg">
          <EmptyState
            title="No matches yet"
            description="Once matching is run and attendees answer questions, your top matches will appear here."
          />
        </Card>
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

  // Build QuestionnaireAnswers per profile
  const answersByProfile = new Map<string, QuestionnaireAnswers>();
  answerRows.forEach((row: any) => {
    const pid = String(row.profile_id);
    const qid = String(row.question_id);
    const v = row.answer as any;
    const n =
      typeof v === "number"
        ? v
        : typeof v?.value === "number"
        ? v.value
        : null;
    if (!(n === 1 || n === 2 || n === 3 || n === 4)) return;
    if (!answersByProfile.has(pid)) {
      answersByProfile.set(pid, {});
    }
    const qa = answersByProfile.get(pid)!;
    qa[qid] = n;
  });

  const currentAnswers = answersByProfile.get(session.profile_id);
  if (!currentAnswers) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Link
            href={`/events/${event.id}/questions`}
            className="text-sm font-medium hover:underline inline-block"
            style={{ color: "var(--primary)" }}
          >
            → Go to Event Questions
          </Link>
        </div>
        <PageHeader
          title="Your Matches"
          subtitle="Answer this event's questions to see your matches."
        />
        <Card padding="lg">
          <EmptyState
            title="No answers yet"
            description="Complete the event questionnaire first, then return to see your matches."
          />
        </Card>
      </div>
    );
  }

  // Build questions model for explanation text
  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, prompt, weight")
    .eq("event_id", event.id)
    .order("order_index", { ascending: true });

  const questions: Question[] = (questionRows || []).map((q: any) => ({
    id: String(q.id),
    text: q.prompt,
    category: "Custom" as any,
    weight: Number(q.weight ?? 1),
    isDealbreaker: false,
  }));

  // Build MatchUser models
  const others: MatchUser[] = [];
  for (const [pid, qa] of answersByProfile.entries()) {
    if (pid === session.profile_id) continue;
    others.push({
      id: pid,
      name: pid,
      city: "",
      answers: qa,
    });
  }

  if (others.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <PageHeader
          title="Your Matches"
          subtitle="Waiting for more attendees to complete their questionnaires."
        />
        <Card padding="lg">
          <EmptyState
            title="No matches yet"
            description="Once others answer their questions, your matches will appear here."
          />
        </Card>
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

  // One-by-one reveal: client fetches reveal-state and reveal-next
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <MatchRealtimeSubscriber eventId={event.id} />
      <PageHeader
        title="Your Matches"
        subtitle={`Top matches for ${event.title}`}
      />
      <h2 className="sr-only" data-testid="matches-headline">
        Your Matches
      </h2>

      <MatchRevealView eventId={event.id} eventTitle={event.title} />

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

