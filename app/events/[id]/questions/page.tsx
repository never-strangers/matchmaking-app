import Link from "next/link";
import { redirect } from "next/navigation";
import { requireApprovedUser } from "@/lib/auth/requireApprovedUser";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuestionForm } from "./QuestionForm";

type DbQuestion = {
  id: string;
  prompt: string;
  order_index: number;
};

type DbAnswer = {
  question_id: string;
  answer: unknown;
};

type EventQuestionsPageProps = {
  params: Promise<{ id: string }>;
};

async function getEventQuestionsData(eventId: string, profileId: string) {
  const supabase = getServiceSupabaseClient();

  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .select("id, title, status, price_cents, payment_required")
    .eq("id", eventId)
    .single();

  if (eventError || !eventRow) {
    throw new Error("Event not found");
  }

  const { data: attendeeRow } = await supabase
    .from("event_attendees")
    .select("payment_status, ticket_type_id")
    .eq("event_id", eventId)
    .eq("profile_id", profileId)
    .maybeSingle();

  const { data: ticketTypes } = await supabase
    .from("event_ticket_types")
    .select("id, code, name, price_cents, currency, cap, sold, is_active")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Load questions
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, prompt, order_index")
    .eq("event_id", eventId)
    .order("order_index", { ascending: true });

  if (questionsError) {
    console.error("Error loading questions:", questionsError);
  }

  const { data: answers, error: answersError } = await supabase
    .from("answers")
    .select("question_id, answer")
    .eq("event_id", eventId)
    .eq("profile_id", profileId);

  if (answersError) {
    console.error("Error loading answers:", answersError);
  }

  const answersMap: Record<string, number> = {};
  (answers || []).forEach((row: DbAnswer) => {
    const v = row.answer as any;
    const n =
      typeof v === "number"
        ? v
        : typeof v?.value === "number"
        ? v.value
        : null;
    if (n === 1 || n === 2 || n === 3 || n === 4) {
      answersMap[row.question_id] = n;
    }
  });

  const totalQuestions = questions?.length || 0;
  const answeredCount = Object.keys(answersMap).length;
  const isComplete = totalQuestions > 0 && answeredCount >= totalQuestions;

  const paymentRequired =
    (eventRow as { payment_required?: boolean }).payment_required !== false;
  const priceCents = Number((eventRow as { price_cents?: number }).price_cents ?? 0);
  const paymentStatus = (attendeeRow as { payment_status?: string } | null)?.payment_status ?? "unpaid";
  const hasReservedTicket = !!(attendeeRow as { ticket_type_id?: string | null } | null)?.ticket_type_id;
  const ticketTypesList = (ticketTypes || []) as { id: string; code: string; name: string; price_cents: number; currency: string; cap: number; sold: number }[];

  return {
    eventTitle: eventRow.title as string,
    questions: (questions || []) as DbQuestion[],
    answers: answersMap,
    totalQuestions,
    answeredCount,
    isComplete,
    paymentRequired,
    priceCents,
    paymentStatus,
    ticketTypes: ticketTypesList,
    hasReservedTicket,
  };
}

export default async function EventQuestionsPage(props: EventQuestionsPageProps) {
  const { id: eventId } = await props.params;
  const session = await requireApprovedUser();

  const {
    eventTitle,
    questions,
    answers,
    isComplete: initialIsComplete,
    paymentRequired,
    priceCents,
    paymentStatus,
    ticketTypes,
    hasReservedTicket,
  } = await getEventQuestionsData(eventId, session.profile_id);

  // Questions are shown after payment. If payment is required and not yet paid, send user to event page to pay first.
  if (paymentRequired && paymentStatus !== "paid") {
    const supabase = getServiceSupabaseClient();
    await supabase
      .from("event_attendees")
      .upsert(
        {
          event_id: eventId,
          profile_id: session.profile_id,
          joined_at: new Date().toISOString(),
        },
        { onConflict: "event_id,profile_id" }
      );
    redirect(`/events/${eventId}`);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-6">
        <Link
          href="/events"
          className="text-sm hover:underline inline-block mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to Events
        </Link>
        <PageHeader
          title="Event Questionnaire"
          subtitle={`Answer all questions for ${eventTitle} to be eligible for matches`}
        />
      </div>

      <QuestionForm
        eventId={eventId}
        eventTitle={eventTitle}
        questions={questions}
        initialAnswers={answers}
        initialIsComplete={initialIsComplete}
        paymentRequired={paymentRequired}
        priceCents={priceCents}
        paymentStatus={paymentStatus}
        ticketTypes={ticketTypes}
        hasReservedTicket={hasReservedTicket}
      />
    </div>
  );
}
