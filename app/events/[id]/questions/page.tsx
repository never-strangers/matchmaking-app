"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth/useSession";
import { useDemoStore } from "@/lib/demo/demoStore";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import { AnswerValue } from "@/types/questionnaire";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

export default function EventQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { user, isLoggedIn, isLoading } = useSession();
  const {
    getEvent,
    getAnswers,
    setAnswer,
    hasAllAnswers,
    getAnswerCount,
  } = useDemoStore();

  const [event, setEvent] = useState(useDemoStore.getState().getEvent(eventId));
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn || !user) {
      router.replace("/login");
      return;
    }

    const eventData = getEvent(eventId);
    if (!eventData) {
      router.replace("/events");
      return;
    }
    setEvent(eventData);

    let existingAnswers = getAnswers(eventId, user.email);
    const hadExistingAnswers = Object.keys(existingAnswers).length > 0;

    if (!hadExistingAnswers && eventData.questions.length > 0) {
      const defaultAnswers: Record<string, AnswerValue> = {};
      eventData.questions.slice(0, 10).forEach((qId) => {
        defaultAnswers[qId] = 3;
        setAnswer(eventId, user.email, qId, 3);
      });
      existingAnswers = getAnswers(eventId, user.email);
    }

    setAnswers(existingAnswers);
    setInitialized(true);

    if (hadExistingAnswers && hasAllAnswers(eventId, user.email)) {
      setSaved(true);
    }
  }, [
    eventId,
    isLoggedIn,
    isLoading,
    user,
    router,
    getEvent,
    getAnswers,
    hasAllAnswers,
    setAnswer,
  ]);

  const handleConfirmAnswers = () => {
    if (!user?.email) return;
    if (!hasAllAnswers(eventId, user.email)) return;
    setSaved(true);
    router.replace("/events");
  };

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    if (saved || !user?.email) return;
    setAnswer(eventId, user.email, questionId, value);
    setAnswers({ ...getAnswers(eventId, user.email) });
  };

  if (isLoading || !initialized) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn || !user || !event) {
    return null;
  }

  const eventQuestions = event.questions
    .map((qId) => QUESTIONS.find((q) => q.id === qId))
    .filter((q): q is NonNullable<typeof q> => q !== undefined)
    .slice(0, 10);

  const answeredCount = getAnswerCount(eventId, user.email);
  const isComplete = hasAllAnswers(eventId, user.email);

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
          title={`Event Questionnaire`}
          subtitle={`Answer all 10 questions for ${event.title} to be eligible for introductions`}
        />
      </div>

      {saved && (
        <Card className="mb-6" style={{ backgroundColor: "var(--success-light)", borderColor: "var(--success)" }}>
          <div className="flex items-center gap-2">
            <Badge variant="success">✓ Complete</Badge>
            <p className="text-sm" style={{ color: "var(--success)" }}>
              Questions completed! You are now eligible for introductions.
            </p>
          </div>
        </Card>
      )}

      <Card padding="lg">
        <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Your Responses
          </h2>
          <Badge variant={isComplete ? "success" : "warning"}>
            {answeredCount}/10 {isComplete ? "✓" : ""}
          </Badge>
        </div>

        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Use the scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Agree, 4 = Strongly Agree
        </p>

        <div className="space-y-8 max-h-[600px] overflow-y-auto">
          {eventQuestions.map((question) => (
            <div key={question.id} className="space-y-3 pb-6 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
              <label className="block text-sm font-medium" style={{ color: "var(--text)" }}>
                {question.text}
                {question.isDealbreaker && (
                  <Badge variant="danger" size="sm" className="ml-2">
                    Important
                  </Badge>
                )}
              </label>
              <div className="flex flex-wrap gap-4">
                {[1, 2, 3, 4].map((value) => (
                  <label
                    key={value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={value}
                      checked={answers[question.id] === value}
                      onChange={() =>
                        handleAnswerChange(question.id, value as AnswerValue)
                      }
                      disabled={saved}
                      className="w-4 h-4 text-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)] disabled:opacity-50"
                    />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {value === 1
                        ? "Strongly Disagree"
                        : value === 2
                        ? "Disagree"
                        : value === 3
                        ? "Agree"
                        : "Strongly Agree"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {isComplete && !saved && (
          <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
            <Card
              padding="md"
              style={{ backgroundColor: "var(--success-light)", borderColor: "var(--success)" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm" style={{ color: "var(--success)" }}>
                  All questions answered. Review your responses, then confirm to lock them in for matching.
                </p>
                <Button
                  onClick={handleConfirmAnswers}
                  variant="success"
                  size="md"
                >
                  Confirm Answers
                </Button>
              </div>
            </Card>
          </div>
        )}

        {!isComplete && (
          <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--warning)" }}>
              Please answer all 10 questions to continue.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
