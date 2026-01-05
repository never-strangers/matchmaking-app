"use client";

import { Question } from "@/lib/events/new/mock";

interface SelectedQuestionListProps {
  questions: Question[];
  onRemove: (id: string) => void;
  onStartWithSuggested: () => void;
}

export default function SelectedQuestionList({
  questions,
  onRemove,
  onStartWithSuggested,
}: SelectedQuestionListProps) {
  return (
    <div className="bg-white border border-beige-frame rounded-xl p-6 h-full min-h-[600px]">
      <h2 className="text-lg font-medium text-gray-dark mb-4">YOUR EVENT</h2>
      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <p className="text-sm text-gray-medium mb-4">
            Drag questions here to start building your questionnaire.
          </p>
          <button
            type="button"
            onClick={onStartWithSuggested}
            className="px-4 py-2 bg-gray-200 border border-beige-frame rounded-lg text-sm text-gray-dark hover:bg-gray-300 transition-colors"
          >
            Start with SUGGESTED
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <div
              key={question.id}
              className="flex items-start justify-between p-3 bg-beige-light rounded-lg border border-beige-frame"
            >
              <span className="text-sm text-gray-dark flex-1">{question.text}</span>
              <button
                type="button"
                onClick={() => onRemove(question.id)}
                className="ml-2 text-gray-medium hover:text-gray-dark transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

