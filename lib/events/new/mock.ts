export type MatchingMode = "Platonic" | "Romantic" | "Professional";

export type AgeMode = "Ignore" | "Consider";

export type TierId = "free" | "basic" | "premium" | "elite";

export type Tier = {
  id: TierId;
  title: string;
  priceLabel: string;
  description: string;
};

export type QuestionCategory =
  | "Suggested"
  | "Popular"
  | "Important"
  | "Spicy"
  | "Queer"
  | "Random";

export type Question = {
  id: string;
  text: string;
  category: QuestionCategory;
  badge?: "Premium";
};

export const matchingModes: Array<{
  id: MatchingMode;
  title: string;
  subtitle: string;
}> = [
  {
    id: "Platonic",
    title: "Platonic",
    subtitle: "Focus on friendship and meaningful connections",
  },
  {
    id: "Romantic",
    title: "Romantic",
    subtitle: "Help people find romantic partners",
  },
  {
    id: "Professional",
    title: "Professional",
    subtitle: "Networking and career connections",
  },
];

export const ageModes: Array<{
  id: AgeMode;
  title: string;
  subtitle: string;
}> = [
  {
    id: "Ignore",
    title: "Ignore",
    subtitle: "Age won't affect matching",
  },
  {
    id: "Consider",
    title: "Consider",
    subtitle: "Factor age into compatibility",
  },
];

export const tiers: Tier[] = [
  {
    id: "free",
    title: "Free",
    priceLabel: "Free",
    description: "Basic matching features",
  },
  {
    id: "basic",
    title: "Basic",
    priceLabel: "$4/guest",
    description: "Enhanced matching algorithm",
  },
  {
    id: "premium",
    title: "Premium",
    priceLabel: "$8/guest",
    description: "Advanced features and analytics",
  },
  {
    id: "elite",
    title: "Elite",
    priceLabel: "$15/guest",
    description: "Full suite with priority support",
  },
];

export const guestTicks = [
  0, 12, 20, 30, 40, 50, 60, 80, 100, 150, 200, 500,
];

export const questionCategories: QuestionCategory[] = [
  "Suggested",
  "Popular",
  "Important",
  "Spicy",
  "Queer",
  "Random",
];

export const questions: Question[] = [
  // Suggested
  { id: "1", text: "What's your ideal weekend?", category: "Suggested" },
  { id: "2", text: "Coffee or tea?", category: "Suggested" },
  { id: "3", text: "Favorite way to unwind?", category: "Suggested" },
  { id: "4", text: "What makes you laugh?", category: "Suggested" },
  { id: "5", text: "Best travel destination?", category: "Suggested" },
  { id: "6", text: "Morning person or night owl?", category: "Suggested" },
  { id: "7", text: "Favorite cuisine?", category: "Suggested" },
  { id: "8", text: "What's your love language?", category: "Suggested" },
  { id: "9", text: "How do you handle conflict?", category: "Suggested" },
  { id: "10", text: "What's your communication style?", category: "Suggested" },

  // Popular
  { id: "11", text: "What's your biggest fear?", category: "Popular" },
  { id: "12", text: "Most embarrassing moment?", category: "Popular" },
  { id: "13", text: "What's your guilty pleasure?", category: "Popular" },
  { id: "14", text: "Best first date idea?", category: "Popular" },
  { id: "15", text: "What's your dealbreaker?", category: "Popular" },
  { id: "16", text: "How do you show affection?", category: "Popular" },
  { id: "17", text: "What's your superpower?", category: "Popular" },
  { id: "18", text: "Favorite way to spend a rainy day?", category: "Popular" },
  { id: "19", text: "What's your biggest pet peeve?", category: "Popular" },
  { id: "20", text: "How do you recharge?", category: "Popular" },
  { id: "21", text: "What's your ideal date night?", category: "Popular" },
  { id: "22", text: "How do you express love?", category: "Popular" },

  // Important
  { id: "23", text: "What are your life goals?", category: "Important" },
  { id: "24", text: "How do you handle stress?", category: "Important" },
  { id: "25", text: "What's your relationship philosophy?", category: "Important" },
  { id: "26", text: "How important is family?", category: "Important" },
  { id: "27", text: "What are your core values?", category: "Important" },
  { id: "28", text: "How do you make decisions?", category: "Important" },
  { id: "29", text: "What's your approach to money?", category: "Important" },
  { id: "30", text: "How do you handle disagreements?", category: "Important" },
  { id: "31", text: "What's your ideal partnership?", category: "Important" },
  { id: "32", text: "How do you maintain boundaries?", category: "Important" },

  // Spicy
  { id: "33", text: "What's your wildest fantasy?", category: "Spicy" },
  { id: "34", text: "What turns you on?", category: "Spicy" },
  { id: "35", text: "What's your kink?", category: "Spicy" },
  { id: "36", text: "Favorite position?", category: "Spicy" },
  { id: "37", text: "What's your secret desire?", category: "Spicy" },
  { id: "38", text: "How adventurous are you?", category: "Spicy" },
  { id: "39", text: "What's your biggest turn-off?", category: "Spicy" },
  { id: "40", text: "How do you like to be seduced?", category: "Spicy" },
  { id: "41", text: "What's your bedroom style?", category: "Spicy" },
  { id: "42", text: "What makes you feel sexy?", category: "Spicy" },
  { id: "43", text: "What's your favorite foreplay?", category: "Spicy" },
  { id: "44", text: "How do you communicate in bed?", category: "Spicy" },

  // Queer
  { id: "45", text: "How do you identify?", category: "Queer" },
  { id: "46", text: "What's your coming out story?", category: "Queer" },
  { id: "47", text: "Favorite queer space?", category: "Queer" },
  { id: "48", text: "How do you celebrate pride?", category: "Queer" },
  { id: "49", text: "What's your queer community like?", category: "Queer" },
  { id: "50", text: "How do you navigate dating?", category: "Queer" },
  { id: "51", text: "What's your favorite queer icon?", category: "Queer" },
  { id: "52", text: "How do you express your identity?", category: "Queer" },
  { id: "53", text: "What's your queer experience?", category: "Queer" },
  { id: "54", text: "How do you find community?", category: "Queer" },
  { id: "55", text: "What's your relationship to labels?", category: "Queer" },
  { id: "56", text: "How do you celebrate diversity?", category: "Queer" },

  // Random
  { id: "57", text: "If you were a pizza topping?", category: "Random" },
  { id: "58", text: "What's your spirit animal?", category: "Random" },
  { id: "59", text: "If you could time travel?", category: "Random" },
  { id: "60", text: "What's your weirdest habit?", category: "Random" },
  { id: "61", text: "If you were a superhero?", category: "Random" },
  { id: "62", text: "What's your useless talent?", category: "Random" },
  { id: "63", text: "If you could have any superpower?", category: "Random" },
  { id: "64", text: "What's your favorite conspiracy theory?", category: "Random" },
  { id: "65", text: "If you were a character in a book?", category: "Random" },
  { id: "66", text: "What's your weirdest fear?", category: "Random" },
  { id: "67", text: "If you could live anywhere?", category: "Random" },
  { id: "68", text: "What's your most random skill?", category: "Random" },
  { id: "69", text: "If you could meet anyone?", category: "Random" },
  { id: "70", text: "What's your strangest dream?", category: "Random" },
  { id: "71", text: "If you were a meme?", category: "Random" },
  { id: "72", text: "What's your weirdest opinion?", category: "Random" },
];


