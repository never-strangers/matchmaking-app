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
    .select("payment_status, ticket_type_id, ticket_status")
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

  const { count: questionCount } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const totalQuestions = questionCount ?? 0;
  const answeredCount = answerCount ?? 0;
  const completed = totalQuestions > 0 && answeredCount >= totalQuestions;

  const { data: runRow } = await supabase
    .from("match_runs")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "done")
    .limit(1)
    .maybeSingle();

  const matchesRun = !!runRow;
  const priceCents = Number((event as { price_cents?: number }).price_cents ?? 0);
  const paymentRequired = (event as { payment_required?: boolean }).payment_required !== false && priceCents > 0;
  const paid =
    paymentStatus === "paid" ||
    paymentStatus === "free" ||
    paymentStatus === "not_required";
  const canViewMatches = matchesRun && (!paymentRequired || paid);

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
  // Questions come after payment: pay first, then questionnaire
  if (joined && paymentRequired && !paid) {
    if (hasTicketTypes && !hasReservedTicket) {
      primaryLabel = "Select ticket";
      primaryHref = ""; // ticket selection shown below
    } else {
      primaryLabel = "Pay to confirm";
      primaryHref = "";
    }
  } else if (joined && !completed) {
    primaryLabel = "Complete Questions";
    primaryHref = `/events/${eventId}/questions`;
  } else if (joined && completed) {
    if (canViewMatches) {
      primaryLabel = "View Matches";
      primaryHref = `/match?event=${encodeURIComponent(eventId)}`;
    } else {
      primaryLabel = "Matches pending";
      primaryHref = "#";
      showPrimary = false;
    }
  }

  const category = (event as { category?: string }).category ?? "friends";
  const whatsIncluded = (event as { whats_included?: string | null }).whats_included;
  const lines = whatsIncluded
    ? whatsIncluded
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };
  const formatTime = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
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
            className="w-full aspect-[3/2] object-cover"
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
            <p className="text-sm mb-4 whitespace-pre-wrap" style={{ color: "var(--text)" }}>
              {event.description}
            </p>
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

          {lines.length > 0 && (
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
