import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function GET(_req: NextRequest) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const supabase = getServiceSupabaseClient();
  const { data: rows, error } = await supabase
    .from("conversations")
    .select("id, event_id, user_a_id, user_b_id, created_at")
    .or(`user_a_id.eq.${auth.profile_id},user_b_id.eq.${auth.profile_id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    return new Response(
      JSON.stringify({ error: "Failed to load conversations" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const eventIds = [...new Set((rows || []).map((r) => r.event_id))];
  const { data: events } =
    eventIds.length > 0
      ? await supabase.from("events").select("id, title").in("id", eventIds)
      : { data: [] };
  const eventMap = new Map((events || []).map((e: { id: string; title: string }) => [e.id, e.title]));

  const profileIds = new Set<string>();
  (rows || []).forEach((r: { user_a_id: string; user_b_id: string }) => {
    profileIds.add(r.user_a_id);
    profileIds.add(r.user_b_id);
  });
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", profileIds.size ? [...profileIds] : ["__none__"]);
  const profileMap = new Map(
    (profileRows || []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name || p.id])
  );

  const list = (rows || []).map((r: { id: string; event_id: string; user_a_id: string; user_b_id: string; created_at: string }) => {
    const otherId = r.user_a_id === auth.profile_id ? r.user_b_id : r.user_a_id;
    return {
      id: r.id,
      eventId: r.event_id,
      eventTitle: eventMap.get(r.event_id) || "",
      otherProfileId: otherId,
      otherDisplayName: profileMap.get(otherId) || otherId,
      created_at: r.created_at,
    };
  });

  return Response.json({ conversations: list });
}
