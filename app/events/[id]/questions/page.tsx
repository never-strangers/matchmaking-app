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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

  // Load questions: prefer event_questions (new), fall back to questions (legacy)
  const { data: eventQuestions } = await supabase
    .from("event_questions")
    .select("id, prompt, sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  let questions: Array<{ id: string; prompt: string; order_index: number }> | null = null;
  let questionsError: unknown = null;

  if (eventQuestions && eventQuestions.length > 0) {
    // New: event_questions table
    questions = eventQuestions.map((eq: { id: string; prompt: string; sort_order: number }) => ({
      id: eq.id,
      prompt: eq.prompt,
      order_index: eq.sort_order,
    }));
  } else {
    // Legacy: questions table (existing seeded events)
    const legacyRes = await supabase
      .from("questions")
      .select("id, prompt, order_index")
      .eq("event_id", eventId)
      .order("order_index", { ascending: true });
    questions = legacyRes.data;
    questionsError = legacyRes.error;
    if (questionsError) {
      console.error("Error loading questions:", questionsError);
    }
  }

  const { data: answers, error: answersError } = await supabase
    .from("answers")
    .select("question_id, event_question_id, answer")
    .eq("event_id", eventId)
    .eq("profile_id", profileId);

  if (answersError) {
    console.error("Error loading answers:", answersError);
  }

  const answersMap: Record<string, number> = {};
  (answers || []).forEach((row: DbAnswer & { event_question_id?: string | null }) => {
    const v = row.answer as any;
    const n =
      typeof v === "number"
        ? v
        : typeof v?.value === "number"
        ? v.value
        : null;
    if (n === 1 || n === 2 || n === 3 || n === 4) {
      // Support both new (event_question_id) and legacy (question_id) keys
      const key = row.event_question_id ?? row.question_id;
      answersMap[key] = n;
    }
  });

  const totalQuestions = questions?.length || 0;
  const answeredCount = Object.keys(answersMap).length;
  const isComplete = totalQuestions > 0 && answeredCount >= totalQuestions;

  const priceCents = Number((eventRow as { price_cents?: number }).price_cents ?? 0);
  const paymentRequired =
    (eventRow as { payment_required?: boolean }).payment_required !== false &&
    priceCents > 0;
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
  const resolvedSearch = props.searchParams ? await props.searchParams : {};
  const returnCity = typeof resolvedSearch.returnCity === "string" ? resolvedSearch.returnCity : null;

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
  const isPaid =
    paymentStatus === "paid" ||
    paymentStatus === "free" ||
    paymentStatus === "not_required";
  if (paymentRequired && !isPaid) {
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
          href={returnCity ? `/events?city=${encodeURIComponent(returnCity)}` : "/events"}
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
        returnCity={returnCity}
      />
    </div>
  );
}
