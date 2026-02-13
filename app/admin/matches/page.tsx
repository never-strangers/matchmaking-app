import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import AdminShell from "@/components/admin/AdminShell";
import Card from "@/components/admin/Card";
import { AdminMatchesClient } from "./AdminMatchesClient";

type MatchRowData = {
  aProfileId: string;
  bProfileId: string;
  aName: string;
  bName: string;
  score: number;
};

type EventOption = { id: string; title: string; matchCount: number };

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/events");

  const { event: eventIdParam } = await searchParams;
  const supabase = getServiceSupabaseClient();

  const { data: allEvents } = await supabase
    .from("events")
    .select("id, title, status")
    .order("created_at", { ascending: true });

  const eventIds = (allEvents || []).map((e) => e.id);
  let matchCountsByEvent: Record<string, number> = {};
  if (eventIds.length > 0) {
    const { data: matchRows } = await supabase
      .from("match_results")
      .select("event_id")
      .in("event_id", eventIds);
    (matchRows || []).forEach((r: { event_id: string }) => {
      const id = String(r.event_id);
      matchCountsByEvent[id] = (matchCountsByEvent[id] || 0) + 1;
    });
  }

  const eventOptions: EventOption[] = (allEvents || []).map((e) => ({
    id: String(e.id),
    title: e.title,
    matchCount: matchCountsByEvent[String(e.id)] || 0,
  }));

  const selectedEventId =
    eventIdParam && eventOptions.some((e) => e.id === eventIdParam)
      ? eventIdParam
      : eventOptions[0]?.id;

  const event = eventOptions.find((e) => e.id === selectedEventId);
  if (!event) {
    return (
      <AdminShell>
        <Card>
          <p className="text-sm text-gray-medium mb-4">No events found. Create an event from the Dashboard.</p>
          <Link href="/admin" className="text-sm text-red-accent hover:underline">← Dashboard</Link>
        </Card>
      </AdminShell>
    );
  }

  const { data: matchRows } = await supabase
    .from("match_results")
    .select("a_profile_id, b_profile_id, score")
    .eq("event_id", selectedEventId)
    .order("score", { ascending: false });

  const profileIds = new Set<string>();
  (matchRows || []).forEach((r: { a_profile_id: string; b_profile_id: string }) => {
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

  const matches: MatchRowData[] = (matchRows || []).map((r: { a_profile_id: string; b_profile_id: string; score: number }) => ({
    aProfileId: r.a_profile_id,
    bProfileId: r.b_profile_id,
    aName: profileMap.get(r.a_profile_id) || r.a_profile_id.slice(0, 8),
    bName: profileMap.get(r.b_profile_id) || r.b_profile_id.slice(0, 8),
    score: Number(r.score),
  }));

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-dark mb-1">Matches</h1>
          <AdminMatchesClient
            events={eventOptions}
            selectedEventId={selectedEventId}
            matchCount={matches.length}
          />
        </div>

        <Card>
          {matches.length === 0 ? (
            <p className="text-sm text-gray-medium mb-4">
              No match results yet. Run matching from the Dashboard for this event.
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
                  {matches.map((m, idx) => (
                    <tr key={`${m.aProfileId}-${m.bProfileId}-${idx}`} className="border-b border-beige-frame last:border-0">
                      <td className="py-2 pr-4 text-gray-dark">{m.aName}</td>
                      <td className="py-2 pr-4 text-gray-dark">{m.bName}</td>
                      <td className="py-2 font-medium text-gray-dark">{m.score.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-beige-frame">
            <Link href="/admin" className="text-sm text-gray-medium hover:text-gray-dark">
              ← Dashboard
            </Link>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
