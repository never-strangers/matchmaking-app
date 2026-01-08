"use client";

import { useState } from "react";
import { setDemoUser, setQuestionnaireAnswers } from "@/lib/demoStore";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import { QuestionnaireAnswers, AnswerValue } from "@/types/questionnaire";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function OnboardingPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    city: "",
    interests: [] as string[],
  });
  const [questionnaireAnswers, setQuestionnaireAnswersState] = useState<
    QuestionnaireAnswers
  >({});
  const [submitted, setSubmitted] = useState(false);

  const interestOptions = [
    "Running",
    "Books",
    "Coffee",
    "Tech",
    "Fitness",
    "Cinema",
  ];

  const handleInterestChange = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    setQuestionnaireAnswersState((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate questionnaire if in demo mode
    if (DEMO_MODE) {
      const allQuestionsAnswered = QUESTIONS.every(
        (q) => questionnaireAnswers[q.id] !== undefined
      );
      if (!allQuestionsAnswered) {
        alert("Please answer all questions before submitting.");
        return;
      }
    }

    // Save to demo store
    setDemoUser({
      id: `user_${Date.now()}`,
      name: formData.name,
      email: formData.email,
      city: formData.city,
      interests: formData.interests,
    });

    // Save questionnaire answers if in demo mode
    if (DEMO_MODE && Object.keys(questionnaireAnswers).length > 0) {
      setQuestionnaireAnswers(questionnaireAnswers);
    }

    setSubmitted(true);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-dark mb-8 text-center">
        Welcome to Never Strangers
      </h1>
      {submitted ? (
        <div 
          data-testid="onboarding-success"
          className="bg-beige-frame border border-beige-frame rounded-lg p-4 text-center"
        >
          <p className="text-gray-dark">
            Thank you, onboarding complete (fake)
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-dark mb-2"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              data-testid="onboarding-name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-dark mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              data-testid="onboarding-email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-dark mb-2"
            >
              City
            </label>
            <input
              type="text"
              id="city"
              data-testid="onboarding-city"
              required
              value={formData.city}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, city: e.target.value }))
              }
              className="w-full px-4 py-2 border border-beige-frame rounded-lg bg-white focus:ring-2 focus:ring-red-accent focus:border-red-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-dark mb-3">
              Interests
            </label>
            <div className="space-y-2">
              {interestOptions.map((interest) => (
                <label
                  key={interest}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    data-testid={`onboarding-interest-${interest.toLowerCase()}`}
                    checked={formData.interests.includes(interest)}
                    onChange={() => handleInterestChange(interest)}
                    className="w-4 h-4 text-red-accent border-beige-frame rounded focus:ring-red-accent"
                  />
                  <span className="text-gray-dark">{interest}</span>
                </label>
              ))}
            </div>
          </div>

          {DEMO_MODE && (
            <div className="border-t border-beige-frame pt-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-dark mb-4">
                Matching Questionnaire
              </h2>
              <p className="text-sm text-gray-medium mb-6">
                Answer these questions to help us find your best matches. Use
                the scale: 1 = Strongly Disagree, 2 = Disagree, 3 = Agree, 4 =
                Strongly Agree
              </p>
              <div className="space-y-6">
                {QUESTIONS.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-dark">
                      {question.text}
                      {question.isDealbreaker && (
                        <span className="ml-2 text-xs text-red-accent">
                          (Important)
                        </span>
                      )}
                    </label>
                    <div className="flex gap-4">
                      {[1, 2, 3, 4].map((value) => (
                        <label
                          key={value}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={question.id}
                            data-testid={`q-${question.id}-${value}`}
                            value={value}
                            checked={questionnaireAnswers[question.id] === value}
                            onChange={() =>
                              handleAnswerChange(question.id, value as AnswerValue)
                            }
                            className="w-4 h-4 text-red-accent border-beige-frame focus:ring-red-accent"
                            required={DEMO_MODE}
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
            </div>
          )}

          <button
            type="submit"
            data-testid="onboarding-submit"
            className="w-full bg-red-accent text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}


