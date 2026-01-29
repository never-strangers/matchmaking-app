import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminEventsClient, AdminEventSummary } from "./AdminEventsClient";

type AttendeeRow = {
  profileId: string;
  displayName: string;
  phoneLast4: string;
  joinedAt: string;
  answersCount: number;
  totalQuestions: number;
};

async function getAttendeesByEvent(
  supabase: ReturnType<typeof getServiceSupabaseClient>,
  eventIds: string[]
): Promise<Record<string, AttendeeRow[]>> {
  if (eventIds.length === 0) return {};

  const { data: attendeeRows } = await supabase
    .from("event_attendees")
    .select("event_id, profile_id, joined_at")
    .in("event_id", eventIds);

  const byEvent: Record<string, AttendeeRow[]> = {};
  (attendeeRows || []).forEach((r: { event_id: string; profile_id: string; joined_at: string }) => {
    const eid = String(r.event_id);
    if (!byEvent[eid]) byEvent[eid] = [];
    byEvent[eid].push({
      profileId: r.profile_id,
      displayName: "",
      phoneLast4: "",
      joinedAt: r.joined_at || "",
      answersCount: 0,
      totalQuestions: 0,
    });
  });

  const allProfileIds = [...new Set(Object.values(byEvent).flat().map((a) => a.profileId))];
  if (allProfileIds.length === 0) return byEvent;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, phone_e164")
    .in("id", allProfileIds);

  const profileMap = new Map<string, { display_name: string | null; phone_e164: string | null }>();
  (profiles || []).forEach((p: { id: string; display_name: string | null; phone_e164: string | null }) => {
    const phone = p.phone_e164 || "";
    const last4 = phone.replace(/\D/g, "").slice(-4);
    profileMap.set(p.id, { display_name: p.display_name, phone_e164: last4 });
  });

  const { data: questionRows } = await supabase
    .from("questions")
    .select("event_id, id")
    .in("event_id", eventIds);
  const totalByEvent: Record<string, number> = {};
  (questionRows || []).forEach((r: { event_id: string }) => {
    const eid = String(r.event_id);
    totalByEvent[eid] = (totalByEvent[eid] || 0) + 1;
  });

  const { data: answerRows } = await supabase
    .from("answers")
    .select("event_id, profile_id")
    .in("event_id", eventIds);
  const answersByEventProfile: Record<string, number> = {};
  (answerRows || []).forEach((r: { event_id: string; profile_id: string }) => {
    const key = `${r.event_id}:${r.profile_id}`;
    answersByEventProfile[key] = (answersByEventProfile[key] || 0) + 1;
  });

  for (const eid of Object.keys(byEvent)) {
    byEvent[eid] = byEvent[eid].map((row) => {
      const prof = profileMap.get(row.profileId);
      const total = totalByEvent[eid] || 0;
      const count = answersByEventProfile[`${eid}:${row.profileId}`] || 0;
      return {
        ...row,
        displayName: prof?.display_name || row.profileId.slice(0, 8),
        phoneLast4: prof?.phone_e164 ? `••••${prof.phone_e164}` : "—",
        totalQuestions: total,
        answersCount: count,
      };
    });
    byEvent[eid].sort((a, b) => (b.joinedAt || "").localeCompare(a.joinedAt || ""));
  }
  return byEvent;
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) {
    redirect("/");
  }
  if (session.role !== "admin") {
    redirect("/events");
  }

  const supabase = getServiceSupabaseClient();

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, title, status, created_at")
    .order("created_at", { ascending: true });

  if (eventsError) {
    console.error("Error loading admin events:", eventsError);
  }

  const eventIds = (events || []).map((e) => e.id);
  let matchCountsByEvent: Record<string, number> = {};
  let attendeesByEvent: Record<string, AttendeeRow[]> = {};

  if (eventIds.length > 0) {
    const [matchRes, attendeesRes] = await Promise.all([
      supabase.from("match_results").select("event_id, a_profile_id, b_profile_id"),
      getAttendeesByEvent(supabase, eventIds),
    ]);
    if (matchRes.data) {
      matchRes.data.forEach((row: { event_id: string }) => {
        const id = String(row.event_id);
        matchCountsByEvent[id] = (matchCountsByEvent[id] || 0) + 1;
      });
    }
    attendeesByEvent = attendeesRes;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-4">
        <Link
          href="/events"
          className="text-sm hover:underline py-2 inline-block touch-manipulation"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Events
        </Link>
      </div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Control the live demo event and matching."
      />

      {!events || events.length === 0 ? (
        <Card padding="lg">
          <p style={{ color: "var(--text-muted)" }}>
            No events found. Make sure the seed migrations have been applied.
          </p>
        </Card>
      ) : (
        <>
          <AdminEventsClient
            events={
              (events || []).map(
                (e): AdminEventSummary => ({
                  id: String(e.id),
                  title: e.title,
                  status: e.status,
                  lastRunStatus: null,
                  lastRunAt: null,
                  matchCount: matchCountsByEvent[String(e.id)] || 0,
                })
              )
            }
          />

          {(events || []).map((event) => {
            const eid = String(event.id);
            const attendees = attendeesByEvent[eid] || [];
            return (
              <Card key={eid} padding="lg" className="mt-6">
                <h3 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
                  {event.title}
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
                              {a.joinedAt ? new Date(a.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
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
            );
          })}
        </>
      )}

    </div>
  );
}
