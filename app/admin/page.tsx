import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminEventsClient, AdminEventSummary } from "./AdminEventsClient";

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

  // Load match counts per event
  const eventIds = (events || []).map((e) => e.id);
  let matchCountsByEvent: Record<string, number> = {};

  if (eventIds.length > 0) {
    const { data: matchCounts, error: matchError } = await supabase
      .from("match_results")
      .select("event_id, a_profile_id, b_profile_id");

    if (matchError) {
      console.error("Error loading match counts:", matchError);
    } else {
      const map: Record<string, number> = {};
      (matchCounts || []).forEach((row: any) => {
        const id = String(row.event_id);
        map[id] = (map[id] || 0) + 1;
      });
      matchCountsByEvent = map;
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
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
      )}

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
