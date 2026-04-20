import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/getAuthUser";
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
  matchType: string;
  round: number;
};

type EventOption = { id: string; title: string; matchCount: number };

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; round?: string }>;
}) {
  const session = await getAuthUser();
  if (!session) redirect("/");
  if (session.role !== "admin") redirect("/events");

  const { event: eventIdParam, round: roundParam } = await searchParams;
  const selectedRound = Math.min(3, Math.max(1, parseInt(roundParam ?? "1", 10) || 1));
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

  // Per-round counts for the selected event
  const { data: allRoundRows } = await supabase
    .from("match_results")
    .select("round")
    .eq("event_id", selectedEventId);

  const roundCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  (allRoundRows || []).forEach((r: { round: number }) => {
    if (r.round >= 1 && r.round <= 3) roundCounts[r.round]++;
  });

  // Matches for the selected round only
  const { data: matchRows } = await supabase
    .from("match_results")
    .select("a_profile_id, b_profile_id, score, match_type, round")
    .eq("event_id", selectedEventId)
    .eq("round", selectedRound)
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

  const matches: MatchRowData[] = (matchRows || []).map(
    (r: { a_profile_id: string; b_profile_id: string; score: number; match_type?: string | null; round: number }) => ({
      aProfileId: r.a_profile_id,
      bProfileId: r.b_profile_id,
      aName: profileMap.get(r.a_profile_id) || r.a_profile_id.slice(0, 8),
      bName: profileMap.get(r.b_profile_id) || r.b_profile_id.slice(0, 8),
      score: Number(r.score),
      matchType: r.match_type ?? "date",
      round: r.round,
    })
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-dark">Matches</h1>
        <Card>
          <AdminMatchesClient
            events={eventOptions}
            selectedEventId={selectedEventId}
            selectedRound={selectedRound}
            roundCounts={roundCounts}
            matches={matches}
          />
          <div className="mt-6 pt-4 border-t border-beige-frame">
            <Link href="/admin" className="text-sm text-gray-medium hover:text-gray-dark">
              ← Dashboard
            </Link>
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
