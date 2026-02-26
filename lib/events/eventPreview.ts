/**
 * Helpers for event preview modal: poster URL and questionnaire completion.
 */

export function getEventPosterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath || typeof posterPath !== "string") return null;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;
  return `${baseUrl}/storage/v1/object/public/event-posters/${posterPath}`;
}

export function isQuestionsComplete(
  answeredCount: number,
  requiredCount: number
): boolean {
  return requiredCount > 0 && answeredCount >= requiredCount;
}

export type EventPreviewData = {
  id: string;
  title: string;
  city: string | null;
  category: string;
  start_at: string | null;
  end_at: string | null;
  location: string | null;
  description: string | null;
  whats_included: string | null;
  poster_url: string | null;
  price_cents: number;
  payment_required: boolean;
};

export type AttendeePreviewState = {
  answered_count: number;
  total_questions: number;
  questions_complete: boolean;
  payment_status: string;
  paid: boolean;
};
