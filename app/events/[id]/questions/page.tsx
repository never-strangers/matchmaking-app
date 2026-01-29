import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/sessionToken";
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
  params: {
    id: string;
  };
};

async function getEventQuestionsData(eventId: string, profileId: string) {
  const supabase = getServiceSupabaseClient();

  // Ensure event exists
  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .select("id, title, status")
    .eq("id", eventId)
    .single();

  if (eventError || !eventRow) {
    throw new Error("Event not found");
  }

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

  return {
    eventTitle: eventRow.title as string,
    questions: (questions || []) as DbQuestion[],
    answers: answersMap,
    totalQuestions,
    answeredCount,
    isComplete,
  };
}

export default async function EventQuestionsPage(props: EventQuestionsPageProps) {
  const { id: eventId } = props.params;
  const cookieStore = await cookies();
  const token = cookieStore.get("ns_session")?.value;
  const session = verifySessionToken(token);
  if (!session) {
    redirect("/");
  }

  const {
    eventTitle,
    questions,
    answers,
  } = await getEventQuestionsData(eventId, session.profile_id);

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
      />
    </div>
  );
}
