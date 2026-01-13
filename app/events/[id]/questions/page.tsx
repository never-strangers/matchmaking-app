"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEventById } from "@/lib/demo/eventStore";
import { getCurrentUserId } from "@/lib/demo/authStore";
import { getUserById } from "@/lib/demo/userStore";
import {
  getEventQuestionnaire,
  setEventQuestionnaire,
  isQuestionnaireComplete,
} from "@/lib/demo/questionnaireEventStore";
import { getRegistration } from "@/lib/demo/registrationStore";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import { QuestionnaireAnswers, AnswerValue } from "@/types/questionnaire";
import { Event } from "@/types/event";

export default function EventQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [questionnaireAnswers, setQuestionnaireAnswersState] = useState<
    QuestionnaireAnswers
  >({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);

    const eventData = getEventById(eventId);
    if (!eventData) {
      router.push("/events");
      return;
    }
    setEvent(eventData);

    if (userId) {
      // Check if payment is confirmed
      const registration = getRegistration(eventId, userId);
      const paymentConfirmed = registration?.paymentStatus === "paid" || registration?.rsvpStatus === "confirmed";
      
      if (!paymentConfirmed) {
        alert("Please complete payment before answering the questionnaire.");
        router.push("/events");
        return;
      }

      // Load existing answers for this event
      const existing = getEventQuestionnaire(eventId, userId);
      if (existing) {
        setQuestionnaireAnswersState(existing.answers);
        setSaved(existing.locked || registration?.questionnaireCompleted || false);
      } else {
        // Get the 10 questions that will be shown
        const eventQuestionIds = eventData.questionnaireTemplate.questionIds;
        const templateQuestions = QUESTIONS.filter((q) => eventQuestionIds.includes(q.id));
        const otherQuestions = QUESTIONS.filter((q) => !eventQuestionIds.includes(q.id));
        const selectedQuestions = [...templateQuestions, ...otherQuestions].slice(0, 10);
        const selectedQuestionIds = selectedQuestions.map((q) => q.id);

        // Prefill all 10 questions with default value 3 (Agree)
        const defaultAnswers: QuestionnaireAnswers = {};
        selectedQuestionIds.forEach((qId) => {
          // Always default to 3 (Agree) for demo
          defaultAnswers[qId] = 3;
        });
        
        setQuestionnaireAnswersState(defaultAnswers);
      }
    }
  }, [eventId, router]);

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    if (saved) return; // Don't allow changes if locked
    setQuestionnaireAnswersState((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSave = () => {
    if (!currentUserId || !event) return;

    try {
      setEventQuestionnaire(eventId, currentUserId, questionnaireAnswers);
      setSaved(true);
      alert("Questions saved! You are now eligible for matching.");
      router.push("/events");
    } catch (err: any) {
      alert(err.message || "Failed to save questions");
    }
  };

  if (!event || !currentUserId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <p className="text-gray-medium">Loading...</p>
      </div>
    );
  }

  // Get exactly 10 questions for this event
  // Show template questions first, then fill with others to reach 10
  const eventQuestionIds = event.questionnaireTemplate.questionIds;
  const templateQuestions = QUESTIONS.filter((q) => eventQuestionIds.includes(q.id));
  const otherQuestions = QUESTIONS.filter((q) => !eventQuestionIds.includes(q.id));
  
  // Take template questions first, then fill with others to reach exactly 10
  const eventQuestions = [
    ...templateQuestions,
    ...otherQuestions.slice(0, Math.max(0, 10 - templateQuestions.length))
  ].slice(0, 10); // Ensure exactly 10 questions

  const answeredCount = Object.keys(questionnaireAnswers).filter(
    (key) => questionnaireAnswers[key] !== undefined
  ).length;
  const isComplete = answeredCount >= 10;

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
          Answer at least 10 questions to RSVP to this event.
        </p>
      </div>

      {saved && (
        <div 
          data-testid="questionnaire-completed-badge"
          className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"
        >
          <p className="text-green-800 text-sm">
            ✓ Questions saved! You can now RSVP to this event.
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
                      data-testid={`question-${question.id}-${value}`}
                      checked={questionnaireAnswers[question.id] === value}
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

        <div className="mt-6 pt-6 border-t border-beige-frame">
          <button
            data-testid="questionnaire-save"
            onClick={handleSave}
            disabled={!isComplete || saved}
            className="w-full bg-red-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saved ? "Questions Saved ✓" : "Save Answers"}
          </button>
          {!isComplete && (
            <p className="text-sm text-orange-600 mt-2 text-center">
              Please answer at least 10 questions to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
