import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

/** Normalize instagram input to handle only (no @). Accepts URL or @handle. */
function normalizeInstagramHandle(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("https://instagram.com/")) {
    return trimmed.slice(22).replace(/\/.*$/, "").replace(/^@/, "") || "";
  }
  if (lower.startsWith("http://instagram.com/")) {
    return trimmed.slice(21).replace(/\/.*$/, "").replace(/^@/, "") || "";
  }
  if (lower.startsWith("instagram.com/")) {
    return trimmed.slice(14).replace(/\/.*$/, "").replace(/^@/, "") || "";
  }
  return trimmed.replace(/^@/, "");
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const { id: conversationId } = await context.params;
  const supabase = getServiceSupabaseClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, instagram")
    .eq("id", auth.profile_id)
    .maybeSingle();

  if (!profile) {
    return new Response(
      JSON.stringify({ error: "Profile not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const raw = (profile as { instagram?: string | null }).instagram;
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return new Response(
      JSON.stringify({ error: "Add Instagram to your profile first" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const handle = normalizeInstagramHandle(raw);
  if (!handle) {
    return new Response(
      JSON.stringify({ error: "Add Instagram to your profile first" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("user_a_id, user_b_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) {
    return new Response(
      JSON.stringify({ error: "Conversation not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  const isParticipant =
    conv.user_a_id === auth.profile_id || conv.user_b_id === auth.profile_id;
  if (!isParticipant) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: existing } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("sender_id", auth.profile_id)
    .eq("kind", "contact_share")
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data: msg } = await supabase
      .from("messages")
      .select("id, payload, created_at")
      .eq("id", existing.id)
      .single();
    const payload = (msg?.payload as { handle?: string }) || {};
    return Response.json({
      shared: true,
      alreadyShared: true,
      handle: payload.handle || handle,
    });
  }

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: auth.profile_id,
      kind: "contact_share",
      body: "Shared Instagram",
      payload: { type: "instagram", handle },
    })
    .select("id, sender_id, kind, body, payload, created_at")
    .single();

  if (error) {
    console.error("Error inserting contact_share message:", error);
    return new Response(
      JSON.stringify({ error: "Failed to share" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return Response.json({
    shared: true,
    alreadyShared: false,
    handle,
    message: {
      id: inserted.id,
      senderId: inserted.sender_id,
      kind: inserted.kind,
      body: inserted.body,
      payload: inserted.payload,
      createdAt: inserted.created_at,
    },
  });
}
