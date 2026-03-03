import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const { id: conversationId } = await context.params;
  const supabase = getServiceSupabaseClient();

  const { data: row, error } = await supabase
    .from("conversations")
    .select("id, event_id, user_a_id, user_b_id, created_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching conversation:", error);
    return new Response(
      JSON.stringify({ error: "Failed to load conversation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!row) {
    return new Response(
      JSON.stringify({ error: "Conversation not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const isParticipant =
    row.user_a_id === auth.profile_id || row.user_b_id === auth.profile_id;
  if (!isParticipant) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const otherId = row.user_a_id === auth.profile_id ? row.user_b_id : row.user_a_id;
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", row.event_id)
    .maybeSingle();
  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", otherId)
    .maybeSingle();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("instagram")
    .eq("id", auth.profile_id)
    .maybeSingle();
  const currentUserInstagram =
    (myProfile as { instagram?: string | null } | null)?.instagram?.trim() || null;

  const { data: sharedRow } = await supabase
    .from("messages")
    .select("payload")
    .eq("conversation_id", conversationId)
    .eq("sender_id", auth.profile_id)
    .eq("kind", "contact_share")
    .limit(1)
    .maybeSingle();
  const instagramSharedByMe = !!sharedRow;
  const mySharedHandle = sharedRow?.payload
    ? (sharedRow.payload as { handle?: string })?.handle ?? null
    : null;

  return Response.json({
    id: row.id,
    eventId: row.event_id,
    eventTitle: (event as { title?: string } | null)?.title ?? "",
    otherProfileId: otherId,
    otherDisplayName: (otherProfile as { display_name?: string | null } | null)?.display_name ?? otherId,
    created_at: row.created_at,
    currentUserInstagram,
    instagramSharedByMe,
    mySharedHandle,
  });
}
