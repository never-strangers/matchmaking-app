import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

/**
 * Create a conversation for a match result if it does not exist (e.g. round was revealed before conversations existed).
 * Call when user clicks "Chat now" and my-matches returned conversationId: null.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  let body: { match_result_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const matchResultId = body?.match_result_id;
  if (!matchResultId || typeof matchResultId !== "string") {
    return new Response(
      JSON.stringify({ error: "match_result_id required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = getServiceSupabaseClient();

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("match_result_id", matchResultId)
    .maybeSingle();

  if (existing) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("user_a_id, user_b_id")
      .eq("id", existing.id)
      .single();
    const isParticipant =
      conv?.user_a_id === auth.profile_id || conv?.user_b_id === auth.profile_id;
    if (!isParticipant) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    return Response.json({ conversationId: existing.id });
  }

  const { data: matchRow } = await supabase
    .from("match_results")
    .select("id, event_id, a_profile_id, b_profile_id")
    .eq("id", matchResultId)
    .maybeSingle();

  if (!matchRow) {
    return new Response(
      JSON.stringify({ error: "Match not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const a = String((matchRow as { a_profile_id: string }).a_profile_id);
  const b = String((matchRow as { b_profile_id: string }).b_profile_id);
  if (auth.profile_id !== a && auth.profile_id !== b) {
    return new Response(
      JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: inserted, error } = await supabase
    .from("conversations")
    .insert({
      event_id: (matchRow as { event_id: string }).event_id,
      match_result_id: matchResultId,
      user_a_id: a,
      user_b_id: b,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("match_result_id", matchResultId)
        .maybeSingle();
      if (conv) return Response.json({ conversationId: conv.id });
    }
    console.error("Error creating conversation:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create conversation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  await supabase.from("messages").insert({
    conversation_id: inserted.id,
    sender_id: null,
    kind: "system",
    body: "You've been matched. Say hi 👋",
  });

  return Response.json({ conversationId: inserted.id });
}
