import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function SessionBanner() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) return null;

  const supabase = getServiceSupabaseClient();
  const { data: events } = await supabase
    .from("events")
    .select("title")
    .eq("status", "live")
    .order("created_at", { ascending: true })
    .limit(1);

  const eventTitle = events?.[0]?.title ?? "Event";

  return (
    <div
      className="text-center py-2 px-4 text-sm"
      style={{
        backgroundColor: "var(--bg-muted)",
        color: "var(--text-muted)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      You&apos;re logged in as <strong style={{ color: "var(--text)" }}>{session.display_name}</strong>
      {" · "}
      Event: <strong style={{ color: "var(--text)" }}>{eventTitle}</strong>
    </div>
  );
}
