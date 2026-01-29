"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type Question = {
  id: string;
  prompt: string;
};

type Props = {
  eventId: string;
  eventTitle: string;
  questions: Question[];
  initialAnswers: Record<string, number>;
  /** True when answers were already saved (from server). Green badge only when this or after Save. */
  initialIsComplete?: boolean;
};

export function QuestionForm({
  eventId,
  eventTitle,
  questions,
  initialAnswers,
  initialIsComplete = false,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const initializedRef = useRef(false);

  // Ensure the user is marked as an attendee for this event.
  useEffect(() => {
    if (!eventId) return;
    void fetch(`/api/events/${eventId}/join`, {
      method: "POST",
    }).catch((err) => {
      console.error("Failed to join event", err);
    });
  }, [eventId]);

  // Prefill all questions to 3 if no answers exist yet (UI only).
  useEffect(() => {
    if (!questions.length || initializedRef.current) return;
    initializedRef.current = true;

    const next: Record<string, number> = {};
    for (const q of questions) {
      const existing = initialAnswers[q.id];
      next[q.id] =
        existing && [1, 2, 3, 4].includes(existing) ? existing : 3;
    }
    setAnswers(next);
  }, [questions, initialAnswers]);

  const totalQuestions = questions.length;
  const answeredCount = useMemo(
    () => Object.keys(answers).filter((id) => answers[id] != null).length,
    [answers]
  );
  const allFilled = totalQuestions > 0 && answeredCount >= totalQuestions;
  const showCompleteBadge = allFilled && (hasSavedOnce || initialIsComplete);

  const handleChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleConfirm = async () => {
    if (!allFilled) return;
    setSaving(true);
    try {
      const payloads = questions.map((q) => ({
        question_id: q.id,
        value: answers[q.id],
      }));

      await Promise.all(
        payloads.map((p) =>
          fetch(`/api/events/${eventId}/answers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p),
          })
        )
      );
      setHasSavedOnce(true);
      router.push("/events");
    } catch (err) {
      console.error("Failed to save answers", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding="lg" className="min-w-0 overflow-hidden">
      <div
        className="flex justify-between items-center mb-6 pb-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--text)" }}
        >
          Your Responses
        </h2>
        <Badge variant={showCompleteBadge ? "success" : "warning"}>
          {answeredCount}/{totalQuestions} {showCompleteBadge ? "✓" : ""}
        </Badge>
      </div>

      <p
        className="text-sm mb-6"
        style={{ color: "var(--text-muted)" }}
      >
        Use the scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Agree,
        4 = Strongly Agree
      </p>

      <div className="space-y-8 max-h-[600px] overflow-y-auto min-w-0">
        {questions.map((question) => {
          const currentValue = answers[question.id];
          return (
            <div
              key={question.id}
              className="space-y-3 pb-6 border-b last:border-0 min-w-0"
              style={{ borderColor: "var(--border)" }}
            >
              <label
                className="block text-sm font-medium break-words"
                style={{ color: "var(--text)" }}
              >
                {question.prompt}
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
                      checked={currentValue === value}
                      onChange={() => handleChange(question.id, value)}
                      className="w-4 h-4 text-[var(--primary)] border-[var(--border)] focus:ring-[var(--primary)]"
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
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
          );
        })}
      </div>

      <div
        className="mt-8 pt-6 border-t flex items-center justify-between gap-3 flex-wrap"
        style={{ borderColor: "var(--border)" }}
      >
        <p
          className="text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          {saving ? "Saving…" : "Your responses will be saved when you confirm."}
        </p>
        <Button
          onClick={handleConfirm}
          variant={allFilled ? "success" : "outline"}
          size="md"
          disabled={!allFilled}
        >
          {allFilled ? "Save Answers" : "Complete all questions"}
        </Button>
      </div>
    </Card>
  );
}

