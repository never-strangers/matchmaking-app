import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { fetchAllRows } from "@/lib/supabase/fetchAll";

const VALID_SEGMENTS = ["all", "checked_in", "paid", "eligible"] as const;
type Segment = (typeof VALID_SEGMENTS)[number];

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAuthUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (session.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id: eventId } = await context.params;
  const { searchParams } = new URL(req.url);

  const rawSegment = searchParams.get("segment") ?? "all";
  const segment: Segment = (VALID_SEGMENTS as readonly string[]).includes(rawSegment)
    ? (rawSegment as Segment)
    : "all";
  const format = searchParams.get("format") === "txt" ? "txt" : "csv";

  const supabase = getServiceSupabaseClient();

  // Load event to determine payment gating
  const { data: event } = await supabase
    .from("events")
    .select("id, payment_required, price_cents")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return new Response("Event not found", { status: 404 });

  const paymentRequired =
    (event as { payment_required?: boolean }).payment_required !== false &&
    Number((event as { price_cents?: number }).price_cents ?? 0) > 0;

  // ── Build attendee query ──────────────────────────────────────────────────
  type AttendeeFilter = {
    profile_id: string;
    checked_in: boolean;
    payment_status: string;
  };

  let attendeesQuery = supabase
    .from("event_attendees")
    .select("profile_id, checked_in, payment_status")
    .eq("event_id", eventId);

  if (segment === "checked_in") {
    attendeesQuery = attendeesQuery.eq("checked_in", true);
  } else if (segment === "paid") {
    attendeesQuery = attendeesQuery.in("payment_status", [
      "paid",
      "free",
      "not_required",
    ]);
  } else if (segment === "eligible") {
    // Base: checked-in + payment ok
    attendeesQuery = attendeesQuery.eq("checked_in", true);
    if (paymentRequired) {
      attendeesQuery = attendeesQuery.eq("payment_status", "paid");
    }
    // Questionnaire filter applied below after answer counts
  }

  const { data: attendeeRows, error: attendeesErr } = await attendeesQuery;
  if (attendeesErr) {
    console.error("[export-emails] attendees query error:", attendeesErr);
    return Response.json({ error: "Failed to fetch attendees" }, { status: 500 });
  }

  let profileIds: string[] = (attendeeRows ?? []).map(
    (a: AttendeeFilter) => a.profile_id
  );

  // ── Questionnaire filter for "eligible" ───────────────────────────────────
  if (segment === "eligible" && profileIds.length > 0) {
    // Total question count for this event (new-style first, legacy fallback)
    const { data: eqRows } = await supabase
      .from("event_questions")
      .select("id")
      .eq("event_id", eventId);

    let totalQuestions = eqRows?.length ?? 0;

    if (totalQuestions === 0) {
      const { data: legacyQ } = await supabase
        .from("questions")
        .select("id")
        .eq("event_id", eventId);
      totalQuestions = legacyQ?.length ?? 0;
    }

    if (totalQuestions > 0) {
      const answerRows = await fetchAllRows<{
        profile_id: string;
        event_question_id: string | null;
        question_id: string | null;
      }>(
        (offset, limit) =>
          supabase
            .from("answers")
            .select("profile_id, event_question_id, question_id")
            .eq("event_id", eventId)
            .in("profile_id", profileIds)
            .range(offset, offset + limit - 1)
      );

      // Count distinct questions answered per profile
      const answerCounts = new Map<string, Set<string>>();
      answerRows.forEach(
        (row: {
          profile_id: string;
          event_question_id: string | null;
          question_id: string | null;
        }) => {
          const pid = String(row.profile_id);
          if (!answerCounts.has(pid)) answerCounts.set(pid, new Set());
          const qid = row.event_question_id ?? row.question_id;
          if (qid) answerCounts.get(pid)!.add(String(qid));
        }
      );

      profileIds = profileIds.filter(
        (pid) => (answerCounts.get(pid)?.size ?? 0) >= totalQuestions
      );
    }
  }

  // ── Fetch emails ──────────────────────────────────────────────────────────
  if (profileIds.length === 0) {
    return buildResponse([], segment, eventId, format);
  }

  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("email")
    .in("id", profileIds)
    .not("email", "is", null);

  if (profilesErr) {
    console.error("[export-emails] profiles query error:", profilesErr);
    return Response.json({ error: "Failed to fetch emails" }, { status: 500 });
  }

  // Deduplicate + exclude demo/null emails
  const emails = [
    ...new Set(
      (profiles ?? [])
        .map((p: { email: string | null }) => p.email?.trim().toLowerCase())
        .filter(
          (e): e is string =>
            typeof e === "string" && e.length > 0 && !e.includes("@demo.local")
        )
    ),
  ].sort();

  return buildResponse(emails, segment, eventId, format);
}

function buildResponse(
  emails: string[],
  segment: string,
  eventId: string,
  format: "csv" | "txt"
): Response {
  const shortId = eventId.slice(0, 8);
  const filename = `event-${shortId}-emails-${segment}.${format}`;

  let body: string;
  let contentType: string;

  if (format === "csv") {
    body =
      "email\n" +
      emails.map((e) => `"${e.replace(/"/g, '""')}"`).join("\n");
    contentType = "text/csv; charset=utf-8";
  } else {
    body = emails.join("\n");
    contentType = "text/plain; charset=utf-8";
  }

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache",
    },
  });
}
