"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import FlowShell from "@/components/events/new/FlowShell";
import StepHeader from "@/components/events/new/StepHeader";
import PillTabs from "@/components/events/new/PillTabs";
import QuestionChip from "@/components/events/new/QuestionChip";
import SelectedQuestionList from "@/components/events/new/SelectedQuestionList";
import PrimaryButton from "@/components/events/new/PrimaryButton";
import {
  questions,
  questionCategories,
  QuestionCategory,
  Question,
} from "@/lib/events/new/mock";

export default function QuestionsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory>(
    "Suggested"
  );
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredQuestions = useMemo(() => {
    let filtered = questions.filter((q) => q.category === selectedCategory);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((q) =>
        q.text.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [selectedCategory, searchQuery]);

  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleRemoveQuestion = (questionId: string) => {
    setSelectedQuestions((prev) => prev.filter((id) => id !== questionId));
  };

  const handleStartWithSuggested = () => {
    const suggested = questions
      .filter((q) => q.category === "Suggested")
      .slice(0, 10)
      .map((q) => q.id);
    setSelectedQuestions(suggested);
  };

  const selectedQuestionsData = questions.filter((q) =>
    selectedQuestions.includes(q.id)
  );

  const handleNext = () => {
    // Load existing event data
    const existingData = JSON.parse(
      localStorage.getItem("eventData") || "{}"
    );
    
    // Save event data with question count
    const eventData = {
      ...existingData,
      questionCount: selectedQuestions.length,
      selectedQuestions: selectedQuestions,
    };
    
    localStorage.setItem("eventData", JSON.stringify(eventData));
    router.push("/onboarding/review");
  };

  return (
    <FlowShell maxWidth="max-w-[1400px]">
      <StepHeader
        title="Questions"
        subtitle="Build your event questionnaire"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 mb-8">
        {/* Left Panel */}
        <div>
          <SelectedQuestionList
            questions={selectedQuestionsData}
            onRemove={handleRemoveQuestion}
            onStartWithSuggested={handleStartWithSuggested}
          />
        </div>

        {/* Right Panel */}
        <div>
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-beige-frame rounded-lg text-gray-dark placeholder-gray-medium focus:outline-none focus:ring-2 focus:ring-red-accent focus:border-transparent"
            />
          </div>

          {/* Category Pills */}
          <PillTabs
            categories={questionCategories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />

          {/* Question Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {filteredQuestions.map((question) => (
              <QuestionChip
                key={question.id}
                question={question}
                selected={selectedQuestions.includes(question.id)}
                onClick={() => handleToggleQuestion(question.id)}
              />
            ))}
          </div>

          {/* Selection Count */}
          <div className="text-sm text-gray-medium mb-6">
            Selected {selectedQuestions.length} / 20–30 recommended
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <PrimaryButton onClick={handleNext}>Next</PrimaryButton>
      </div>
    </FlowShell>
  );
}

