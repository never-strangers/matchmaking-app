import { NextRequest } from "next/server";
import { requireApprovedUserForApi } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import {
  getEventPosterUrl,
  isQuestionsComplete,
  type EventPreviewData,
  type AttendeePreviewState,
} from "@/lib/events/eventPreview";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApprovedUserForApi();
  if (auth instanceof Response) return auth;

  const { id: eventId } = await context.params;
  const supabase = getServiceSupabaseClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, title, description, status, start_at, end_at, city, category, whats_included, poster_path, payment_required, price_cents"
    )
    .eq("id", eventId)
    .eq("status", "live")
    .maybeSingle();

  if (eventError || !event) {
    return new Response(
      JSON.stringify({ error: "Event not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const e = event as {
    id: string;
    title: string;
    description?: string | null;
    start_at?: string | null;
    end_at?: string | null;
    city?: string | null;
    category?: string;
    whats_included?: string | null;
    poster_path?: string | null;
    payment_required?: boolean;
    price_cents?: number;
  };

  const posterUrl = getEventPosterUrl(e.poster_path ?? null);
  const priceCents = Number(e.price_cents ?? 0);
  const paymentRequired =
    e.payment_required !== false && priceCents > 0;

  const eventPreview: EventPreviewData = {
    id: e.id,
    title: e.title,
    city: e.city ?? null,
    category: e.category ?? "friends",
    start_at: e.start_at ?? null,
    end_at: e.end_at ?? null,
    location: e.city ?? null,
    description: e.description ?? null,
    whats_included: e.whats_included ?? null,
    poster_url: posterUrl,
    price_cents: priceCents,
    payment_required: paymentRequired,
  };

  const { count: answerCount } = await supabase
    .from("answers")
    .select("question_id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("profile_id", auth.profile_id);

  const { count: questionCount } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const totalQuestions = questionCount ?? 0;
  const answeredCount = answerCount ?? 0;
  const questionsComplete = isQuestionsComplete(answeredCount, totalQuestions);

  const { data: attendeeRow } = await supabase
    .from("event_attendees")
    .select("payment_status")
    .eq("event_id", eventId)
    .eq("profile_id", auth.profile_id)
    .maybeSingle();

  const paymentStatus =
    (attendeeRow as { payment_status?: string } | null)?.payment_status ?? "unpaid";
  const paid =
    paymentStatus === "paid" ||
    paymentStatus === "free" ||
    paymentStatus === "not_required";

  const attendeeState: AttendeePreviewState = {
    answered_count: answeredCount,
    total_questions: totalQuestions,
    questions_complete: questionsComplete,
    payment_status: paymentStatus,
    paid,
  };

  return Response.json({
    event: eventPreview,
    attendee: attendeeState,
  });
}
