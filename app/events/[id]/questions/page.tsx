"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth/useSession";
import { useDemoStore } from "@/lib/demo/demoStore";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import { AnswerValue } from "@/types/questionnaire";

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
    // Wait for session to load before checking
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

    // Load existing answers (before any auto-prefill)
    let existingAnswers = getAnswers(eventId, user.email);
    const hadExistingAnswers = Object.keys(existingAnswers).length > 0;

    // If no answers exist yet, prefill all 10 questions with default value 3 (Agree)
    if (!hadExistingAnswers && eventData.questions.length > 0) {
      const defaultAnswers: Record<string, AnswerValue> = {};
      eventData.questions.slice(0, 10).forEach((qId) => {
        defaultAnswers[qId] = 3; // Default to "Agree"
        // Save to store
        setAnswer(eventId, user.email, qId, 3);
      });
      // Reload from store to ensure consistency
      existingAnswers = getAnswers(eventId, user.email);
    }

    setAnswers(existingAnswers);
    setInitialized(true);

    // Check if already completed from a prior session.
    // We only auto-mark as "saved" if the user had answers *before* any auto-prefill,
    // so that new visitors can freely customise prefilled defaults before submitting.
    if (hadExistingAnswers && hasAllAnswers(eventId, user.email)) {
      setSaved(true);
    }
  }, [eventId, isLoggedIn, isLoading, user, router, getEvent, getAnswers, hasAllAnswers, setAnswer]);

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

  // Show loading state while checking session
  if (isLoading || !initialized) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <p className="text-gray-medium">Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn || !user || !event) {
    return null; // Will redirect
  }

  // Get the 10 questions for this event
  const eventQuestions = event.questions
    .map((qId) => QUESTIONS.find((q) => q.id === qId))
    .filter((q): q is NonNullable<typeof q> => q !== undefined)
    .slice(0, 10);

  const answeredCount = getAnswerCount(eventId, user.email);
  const isComplete = hasAllAnswers(eventId, user.email);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="mb-6">
        <Link
          href="/events"
          className="text-gray-medium hover:text-gray-dark text-sm mb-4 inline-block"
        >
          ← Back to Events
        </Link>
        <h1 className="text-3xl font-bold text-gray-dark mb-2">
          Answer Questions for {event.title}
        </h1>
        <p className="text-gray-medium">
          Answer all 10 questions to be eligible for matching.
        </p>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-sm">
            ✓ Questions completed! You are now eligible for matching.
          </p>
        </div>
      )}

      <div className="bg-white border border-beige-frame rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-dark">
            Event Questionnaire
          </h2>
          <span
            className={`text-sm font-medium ${
              isComplete ? "text-green-600" : "text-orange-600"
            }`}
          >
            {answeredCount}/10 answered {isComplete ? "✓" : ""}
          </span>
        </div>

        <p className="text-sm text-gray-medium mb-6">
          Use the scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Agree, 4 =
          Strongly Agree
        </p>

        <div className="space-y-6 max-h-[600px] overflow-y-auto">
          {eventQuestions.map((question) => (
            <div key={question.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-dark">
                {question.text}
                {question.isDealbreaker && (
                  <span className="ml-2 text-xs text-red-accent">
                    (Important)
                  </span>
                )}
              </label>
              <div className="flex gap-4 flex-wrap">
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
                      className="w-4 h-4 text-red-accent border-beige-frame focus:ring-red-accent disabled:opacity-50"
                    />
                    <span className="text-xs text-gray-medium">
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
          <div className="mt-6 pt-6 border-t border-beige-frame">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-green-800">
                All questions answered. Review your answers, then confirm to lock them in for matching.
              </p>
              <button
                onClick={handleConfirmAnswers}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Confirm answers
              </button>
            </div>
          </div>
        )}

        {!isComplete && (
          <div className="mt-6 pt-6 border-t border-beige-frame">
            <p className="text-sm text-orange-600 text-center">
              Please answer all 10 questions to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
