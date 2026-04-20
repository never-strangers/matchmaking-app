import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase/fetchAll";

export type AttendeeRow = {
  id: string;
  profileId: string;
  displayName: string;
  email: string | null;
  phoneLast4: string;
  joinedAt: string;
  answersCount: number;
  totalQuestions: number;
  paymentStatus: string;
  ticketStatus: string;
  checkedIn: boolean;
  checkedInAt: string | null;
};

export async function getAttendeesByEvent(
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<Record<string, AttendeeRow[]>> {
  if (eventIds.length === 0) return {};

  const { data: attendeeRows } = await supabase
    .from("event_attendees")
    .select("id, event_id, profile_id, joined_at, payment_status, ticket_status, checked_in, checked_in_at")
    .in("event_id", eventIds);

  const byEvent: Record<string, AttendeeRow[]> = {};
  (attendeeRows || []).forEach((r: {
    id: string;
    event_id: string;
    profile_id: string;
    joined_at: string;
    payment_status?: string;
    ticket_status?: string;
    checked_in?: boolean;
    checked_in_at?: string | null;
  }) => {
    const eid = String(r.event_id);
    if (!byEvent[eid]) byEvent[eid] = [];
    byEvent[eid].push({
      id: String(r.id),
      profileId: r.profile_id,
      displayName: "",
      email: null,
      phoneLast4: "",
      joinedAt: r.joined_at || "",
      answersCount: 0,
      totalQuestions: 0,
      paymentStatus: r.payment_status ?? "unpaid",
      ticketStatus: r.ticket_status ?? "reserved",
      checkedIn: r.checked_in ?? false,
      checkedInAt: r.checked_in_at ?? null,
    });
  });

  const allProfileIds = [...new Set(Object.values(byEvent).flat().map((a) => a.profileId))];
  if (allProfileIds.length === 0) return byEvent;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, display_name, phone_e164, email")
    .in("id", allProfileIds);

  const profileMap = new Map<string, { name: string | null; display_name: string | null; phone_e164: string | null; email: string | null }>();
  (profiles || []).forEach((p: { id: string; name: string | null; display_name: string | null; phone_e164: string | null; email: string | null }) => {
    const phone = p.phone_e164 || "";
    const last4 = phone.replace(/\D/g, "").slice(-4);
    profileMap.set(p.id, { name: p.name, display_name: p.display_name, phone_e164: last4, email: p.email ?? null });
  });

  // Prefer event_questions (new-style events); fall back to legacy questions table.
  const { data: eqRows } = await supabase
    .from("event_questions")
    .select("event_id, id")
    .in("event_id", eventIds);
  const eqCountByEvent: Record<string, number> = {};
  (eqRows || []).forEach((r: { event_id: string }) => {
    const eid = String(r.event_id);
    eqCountByEvent[eid] = (eqCountByEvent[eid] || 0) + 1;
  });
  const legacyIds = eventIds.filter((id) => !eqCountByEvent[id]);
  const legacyTotalByEvent: Record<string, number> = {};
  if (legacyIds.length > 0) {
    const { data: questionRows } = await supabase
      .from("questions")
      .select("event_id, id")
      .in("event_id", legacyIds);
    (questionRows || []).forEach((r: { event_id: string }) => {
      const eid = String(r.event_id);
      legacyTotalByEvent[eid] = (legacyTotalByEvent[eid] || 0) + 1;
    });
  }
  const totalByEvent: Record<string, number> = { ...legacyTotalByEvent, ...eqCountByEvent };

  // Build a set of valid event_question_ids per event
  const validEqIdsByEvent: Record<string, Set<string>> = {};
  (eqRows || []).forEach((r: { event_id: string; id: string }) => {
    const eid = String(r.event_id);
    if (!validEqIdsByEvent[eid]) validEqIdsByEvent[eid] = new Set();
    validEqIdsByEvent[eid].add(String(r.id));
  });

  const answerRows = await fetchAllRows<{ event_id: string; profile_id: string; event_question_id: string | null }>(
    (offset, limit) =>
      supabase
        .from("answers")
        .select("event_id, profile_id, event_question_id")
        .in("event_id", eventIds)
        .range(offset, offset + limit - 1)
  );
  // Count DISTINCT event_question_ids per user that match current event_questions
  const answersByEventProfile: Record<string, Set<string>> = {};
  answerRows.forEach((r) => {
    const eid = String(r.event_id);
    const eqId = r.event_question_id ? String(r.event_question_id) : null;
    // Only count if this question is in the current event_questions set
    if (!eqId || !validEqIdsByEvent[eid]?.has(eqId)) return;
    const key = `${eid}:${r.profile_id}`;
    if (!answersByEventProfile[key]) answersByEventProfile[key] = new Set();
    answersByEventProfile[key].add(eqId);
  });

  for (const eid of Object.keys(byEvent)) {
    byEvent[eid] = byEvent[eid].map((row) => {
      const prof = profileMap.get(row.profileId);
      const total = totalByEvent[eid] || 0;
      const count = answersByEventProfile[`${eid}:${row.profileId}`]?.size || 0;
      return {
        ...row,
        displayName: prof?.display_name || prof?.name || row.profileId.slice(0, 8),
        email: prof?.email ?? null,
        phoneLast4: prof?.phone_e164 ? `••••${prof.phone_e164}` : "—",
        totalQuestions: total,
        answersCount: count,
      };
    }) as AttendeeRow[];
    byEvent[eid].sort((a, b) => (b.joinedAt || "").localeCompare(a.joinedAt || ""));
  }
  return byEvent;
}
