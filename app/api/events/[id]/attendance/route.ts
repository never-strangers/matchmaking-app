import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const eventId = (await context.params).id;
  const supabase = getServiceSupabaseClient();

  const { data: attendee, error: attendeeError } = await supabase
    .from("event_attendees")
    .select("event_id, profile_id, joined_at, payment_status, paid_at")
    .eq("event_id", eventId)
    .eq("profile_id", auth.profile_id)
    .single();

  if (attendeeError || !attendee) {
    return new Response(
      JSON.stringify({ error: "Not an attendee for this event" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const { count: answerCount } = await supabase
    .from("answers")
    .select("question_id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("profile_id", auth.profile_id);

  const { count: totalQuestions } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  return Response.json({
    event_id: attendee.event_id,
    profile_id: attendee.profile_id,
    joined_at: attendee.joined_at,
    payment_status: attendee.payment_status,
    paid_at: attendee.paid_at ?? null,
    questions_answered: answerCount ?? 0,
    total_questions: totalQuestions ?? 0,
    questions_completed: (answerCount ?? 0) >= (totalQuestions ?? 0),
  });
}
