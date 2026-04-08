import Link from "next/link";
import { requireApprovedUser } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { PayToConfirmButton } from "@/app/events/PayToConfirmButton";
import { EventTicketReserveBlock } from "@/components/events/EventTicketReserveBlock";
import { notFound } from "next/navigation";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const session = await requireApprovedUser();

  const supabase = getServiceSupabaseClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, description, status, start_at, end_at, city, category, whats_included, poster_path, payment_required, price_cents")
    .eq("id", eventId)
    .eq("status", "live")
    .is("deleted_at", null)
    .maybeSingle();

  if (eventError || !event) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const posterUrl =
    baseUrl && (event as { poster_path?: string | null }).poster_path
      ? `${baseUrl}/storage/v1/object/public/event-posters/${(event as { poster_path: string }).poster_path}`
      : null;

  const { data: attendee } = await supabase
    .from("event_attendees")
    .select("payment_status, ticket_type_id, ticket_status, checked_in")
    .eq("event_id", eventId)
    .eq("profile_id", session.profile_id)
    .maybeSingle();

  const joined = !!attendee;
  const paymentStatus = (attendee as { payment_status?: string } | null)?.payment_status ?? "unpaid";
  const hasReservedTicket = !!(attendee as { ticket_type_id?: string | null } | null)?.ticket_type_id;
  const ticketStatus = (attendee as { ticket_status?: string } | null)?.ticket_status;

  const { count: answerCount } = await supabase
    .from("answers")
    .select("question_id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("profile_id", session.profile_id);

  // Question count: prefer event_questions (new), fall back to questions (legacy)
  const { count: eqCount } = await supabase
    .from("event_questions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  let totalQuestions = eqCount ?? 0;
  if (totalQuestions === 0) {
    const { count: legacyCount } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);
    totalQuestions = legacyCount ?? 0;
  }

  const answeredCount = answerCount ?? 0;
  const completed = totalQuestions > 0 && answeredCount >= totalQuestions;

  // Check-in status
  const checkedIn = !!(attendee as { checked_in?: boolean } | null)?.checked_in;

  const { data: runRow } = await supabase
    .from("match_runs")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "done")
    .limit(1)
    .maybeSingle();

  const matchesRun = !!runRow;

  // Reveal state
  let hasRevealedMatches = false;
  if (matchesRun) {
    const { data: roundRow } = await supabase
      .from("match_rounds")
      .select("last_revealed_round")
      .eq("event_id", eventId)
      .maybeSingle();
    hasRevealedMatches = Number(roundRow?.last_revealed_round ?? 0) > 0;
  }
  const priceCents = Number((event as { price_cents?: number }).price_cents ?? 0);
  const paymentRequired = (event as { payment_required?: boolean }).payment_required !== false && priceCents > 0;
  const paid =
    paymentStatus === "paid" ||
    paymentStatus === "free" ||
    paymentStatus === "not_required";

  const { data: ticketTypes } = await supabase
    .from("event_ticket_types")
    .select("id, code, name, price_cents, currency, cap, sold, is_active")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const hasTicketTypes = Array.isArray(ticketTypes) && ticketTypes.length > 0;

  let primaryLabel = "Enter Event";
  let primaryHref = `/events/${eventId}/questions`;
  let showPrimary = true;
  let statusMessage: string | null = null;
  let statusAction: { label: string; href: string } | null = null;

  if (!joined) {
    // A) Not joined — default "Enter Event"
  } else if (paymentRequired && !paid) {
    // B) Joined but unpaid
    if (hasTicketTypes && !hasReservedTicket) {
      primaryLabel = "Select ticket";
      primaryHref = "";
    } else {
      primaryLabel = "Pay to confirm";
      primaryHref = "";
    }
  } else if (!completed) {
    // C) Paid (or free) but questionnaire not done
    primaryLabel = "Complete Questions";
    primaryHref = `/events/${eventId}/questions`;
  } else if (!checkedIn) {
    // D) Questions done, awaiting host check-in
    showPrimary = false;
    statusMessage = "Your spot is confirmed. The host will check you in at the event. Once you're checked in, head to Matches and wait there — the host will reveal your matches on the night.";
    statusAction = { label: "Go to Matches →", href: `/match?event=${encodeURIComponent(eventId)}` };
  } else if (!matchesRun) {
    // E) Checked in, matching not yet run
    showPrimary = false;
    statusMessage = "You're checked in! Head to your Matches page and stay there — the host will run matching and reveal your pairs on the night.";
    statusAction = { label: "Go to Matches →", href: `/match?event=${encodeURIComponent(eventId)}` };
  } else if (!hasRevealedMatches) {
    // F) Matching done, no reveals yet
    showPrimary = false;
    statusMessage = "Your matches are ready! The host will reveal them one round at a time. Go to your Matches page now and wait — reveals are happening soon.";
    statusAction = { label: "See My Matches →", href: `/match?event=${encodeURIComponent(eventId)}` };
  } else {
    // G) Has revealed matches
    primaryLabel = "View Matches";
    primaryHref = `/match?event=${encodeURIComponent(eventId)}`;
  }

  const category = (event as { category?: string }).category ?? "friends";
  const whatsIncluded = (event as { whats_included?: string | null }).whats_included;
  const lines = whatsIncluded
    ? whatsIncluded
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // All events are in Singapore (UTC+8). Manually offset so it works
  // regardless of Node.js ICU build (small-icu won't honour timeZone option).
  const toSGT = (iso: string) => new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    const d = toSGT(iso);
    return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  };
  const formatTime = (iso: string | null) => {
    if (!iso) return null;
    const d = toSGT(iso);
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  };
  const startAt = (event as { start_at?: string | null }).start_at;
  const endAt = (event as { end_at?: string | null }).end_at;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12" style={{ backgroundColor: "var(--bg)" }}>
      <div className="mb-4">
        <Link
          href="/events"
          className="text-sm hover:underline inline-block"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Events
        </Link>
      </div>

      <Card padding="none" variant="elevated" className="overflow-hidden">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            className="w-full aspect-[3/2] object-contain" style={{ backgroundColor: "var(--bg-dark)" }}
          />
        ) : (
          <div
            className="w-full aspect-[3/2] flex items-center justify-center"
            style={{ backgroundColor: "var(--bg-dark)" }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--border-strong)", opacity: 0.5 }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
        )}
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={category === "dating" ? "info" : "default"}>
              {category === "dating" ? "Dating" : "Friends"}
            </Badge>
            {joined && <Badge variant="success">Joined</Badge>}
            {completed && <Badge variant="info">Questionnaire Complete</Badge>}
            {hasReservedTicket && (
              <Badge variant="warning">
                Ticket {ticketStatus === "paid" ? "Paid" : "Reserved"}
              </Badge>
            )}
          </div>
          <PageHeader
            title={event.title}
            subtitle={
              (event.city
                ? [event.city, startAt ? formatDate(startAt) : null].filter(Boolean).join(" · ")
                : startAt
                  ? formatDate(startAt)
                  : undefined) ?? undefined
            }
          />

          {(startAt || endAt) && (
            <div className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              {startAt && (
                <span>
                  Start: {formatDate(startAt)} {formatTime(startAt)}
                </span>
              )}
              {endAt && (
                <span className={startAt ? " ml-4" : ""}>
                  End: {formatDate(endAt)} {formatTime(endAt)}
                </span>
              )}
            </div>
          )}

          {event.description && (
            <div
              className="text-sm mb-4 prose prose-sm max-w-none"
              style={{ color: "var(--text)" }}
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          )}

          {joined && !completed && totalQuestions > 0 && (
            <div className="mb-4">
              <Card variant="default" padding="md">
                <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
                  Questionnaire required — please complete before the event starts.
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  You have answered {answeredCount}/{totalQuestions} questions so far.
                </p>
              </Card>
            </div>
          )}

          {lines.length > 0 && !((event.description ?? "").toLowerCase().includes("what") && (event.description ?? "").toLowerCase().includes("included")) && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>
                What&apos;s Included
              </h3>
              <ul className="list-disc list-inside text-sm space-y-1" style={{ color: "var(--text-muted)" }}>
                {lines.map((line, i) => (
                  <li key={i}>{line.replace(/^[-•]\s*/, "")}</li>
                ))}
              </ul>
            </div>
          )}

          {hasTicketTypes && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}>
                Ticket types
              </h3>
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                {(ticketTypes as { name: string; price_cents: number; cap: number; sold: number }[]).map((t, i, arr) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                    style={{
                      borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      backgroundColor: "var(--bg-panel)",
                    }}
                  >
                    <span style={{ color: "var(--text)", fontFamily: "var(--font-sans)", fontWeight: 500 }}>{t.name}</span>
                    <div className="flex items-center gap-4">
                      <span style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}>
                        {(t.price_cents / 100).toFixed(2)} SGD
                      </span>
                      <span style={{ color: "var(--text-subtle)", fontFamily: "var(--font-sans)", fontSize: "12px" }}>
                        {t.cap - t.sold} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: "var(--bg-subtle, var(--bg-panel))", border: "1px solid var(--border)" }}>
              <p className="text-sm mb-3" style={{ color: "var(--text)" }}>{statusMessage}</p>
              {statusAction && (
                <Link href={statusAction.href}>
                  <Button size="md" variant="primary">{statusAction.label}</Button>
                </Link>
              )}
            </div>
          )}
          {primaryLabel === "Select ticket" && hasTicketTypes && (
            <EventTicketReserveBlock
              eventId={eventId}
              ticketTypes={(ticketTypes as { id: string; name: string; price_cents: number; currency: string; cap: number; sold: number }[]) || []}
            />
          )}
          {showPrimary && primaryLabel !== "Select ticket" && (
            <div className="mt-4">
              {primaryLabel === "Pay to confirm" ? (
                <PayToConfirmButton eventId={eventId} />
              ) : (
                <Link href={primaryHref}>
                  <Button size="md">{primaryLabel}</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
