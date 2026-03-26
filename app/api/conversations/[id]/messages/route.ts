import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { enqueueEmail } from "@/lib/email/send";
import { newMessageEmail } from "@/lib/email/templates";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const { id: conversationId } = await context.params;
  const supabase = getServiceSupabaseClient();

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

  const { data: rows, error } = await supabase
    .from("messages")
    .select("id, sender_id, kind, body, payload, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return new Response(
      JSON.stringify({ error: "Failed to load messages" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const messages = (rows || []).map(
    (m: {
      id: string;
      sender_id: string | null;
      kind: string;
      body: string | null;
      payload: unknown;
      created_at: string;
    }) => ({
      id: m.id,
      senderId: m.sender_id,
      kind: m.kind,
      body: m.body,
      payload: m.payload,
      createdAt: m.created_at,
    })
  );

  return Response.json({ messages });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const { id: conversationId } = await context.params;
  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) {
    return new Response(
      JSON.stringify({ error: "Message body required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = getServiceSupabaseClient();
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

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: auth.profile_id,
      kind: "text",
      body: text,
    })
    .select("id, sender_id, kind, body, payload, created_at")
    .single();

  if (error) {
    console.error("Error inserting message:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send message" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fire-and-forget: email the recipient on the first user message in the conversation
  void (async () => {
    try {
      const { count: priorTextCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("kind", "text")
        .neq("id", inserted.id);

      if ((priorTextCount ?? 0) > 0) return;

      const recipientId =
        conv.user_a_id === auth.profile_id ? conv.user_b_id : conv.user_a_id;
      const [recipientRes, senderRes] = await Promise.all([
        supabase.from("profiles").select("email, name").eq("id", recipientId).maybeSingle(),
        supabase.from("profiles").select("name").eq("id", auth.profile_id).maybeSingle(),
      ]);
      const recipient = recipientRes.data;
      const sender = senderRes.data;
      if (!recipient?.email || recipient.email.includes("@demo.local")) return;
      const recipientFirstName = (recipient.name ?? "").split(" ")[0] ?? "";
      const senderName = (sender?.name ?? "").split(" ")[0] || "Someone";
      await enqueueEmail(
        `first-message:${conversationId}`,
        "new_message",
        recipient.email,
        newMessageEmail(recipientFirstName, senderName)
      );
    } catch (err) {
      console.error("[email] first message notification error:", err);
    }
  })();

  return Response.json({
    id: inserted.id,
    senderId: inserted.sender_id,
    kind: inserted.kind,
    body: inserted.body,
    payload: inserted.payload,
    createdAt: inserted.created_at,
  });
}
