import { Question } from "@/types/questionnaire";

/**
 * Questionnaire definition for matching algorithm
 * 
 * Answer scale:
 * 1 = Strongly Disagree
 * 2 = Disagree
 * 3 = Agree
 * 4 = Strongly Agree
 */
export const QUESTIONS: Question[] = [
  // Lifestyle Category
  {
    id: "q_lifestyle_1",
    text: "I enjoy large social gatherings and parties",
    category: "Lifestyle",
    weight: 2,
    isDealbreaker: true,
  },
  {
    id: "q_lifestyle_2",
    text: "I prefer deep one-on-one conversations over group settings",
    category: "Lifestyle",
    weight: 2,
    isDealbreaker: true,
  },
  {
    id: "q_lifestyle_3",
    text: "I value work-life balance and prioritize personal time",
    category: "Lifestyle",
    weight: 1,
  },
  {
    id: "q_lifestyle_4",
    text: "I enjoy trying new restaurants and cuisines regularly",
    category: "Lifestyle",
    weight: 1,
  },
  {
    id: "q_lifestyle_5",
    text: "I prefer staying in over going out on weekends",
    category: "Lifestyle",
    weight: 1,
  },

  // Social Category
  {
    id: "q_social_1",
    text: "I am comfortable initiating conversations with strangers",
    category: "Social",
    weight: 2,
  },
  {
    id: "q_social_2",
    text: "I prefer meeting new people through mutual friends",
    category: "Social",
    weight: 1,
  },
  {
    id: "q_social_3",
    text: "I enjoy networking events and professional meetups",
    category: "Social",
    weight: 1,
  },
  {
    id: "q_social_4",
    text: "I value quality friendships over having many acquaintances",
    category: "Social",
    weight: 2,
  },

  // Values Category
  {
    id: "q_values_1",
    text: "I believe in being authentic and honest in all relationships",
    category: "Values",
    weight: 3,
  },
  {
    id: "q_values_2",
    text: "I prioritize personal growth and self-improvement",
    category: "Values",
    weight: 2,
  },
  {
    id: "q_values_3",
    text: "I value experiences over material possessions",
    category: "Values",
    weight: 2,
  },
  {
    id: "q_values_4",
    text: "I believe in giving back to the community",
    category: "Values",
    weight: 1,
  },

  // Communication Category
  {
    id: "q_comm_1",
    text: "I prefer texting over phone calls for daily communication",
    category: "Communication",
    weight: 1,
  },
  {
    id: "q_comm_2",
    text: "I appreciate direct and straightforward communication",
    category: "Communication",
    weight: 2,
  },
  {
    id: "q_comm_3",
    text: "I am comfortable discussing personal topics early in relationships",
    category: "Communication",
    weight: 2,
  },
];

/**
 * Get all question IDs
 */
export function getAllQuestionIds(): string[] {
  return QUESTIONS.map((q) => q.id);
}

/**
 * Get question by ID
 */
export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

/**
 * Get questions by category
 */
export function getQuestionsByCategory(
  category: Question["category"]
): Question[] {
  return QUESTIONS.filter((q) => q.category === category);
}

