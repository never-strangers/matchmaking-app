export type Signup = {
  name: string;
  date: string;
};

export type MatchPair = {
  a: string;
  b: string;
  score: number; // 0..100
  group: string; // e.g. "GROUP 1.2"
  tags?: string[];
};

export type MatchingSummary = {
  romanticMatched: number;
  friendMatched: number;
  calculatedAt: string;
};

export const signups: Signup[] = [
  { name: "Sarah Chen", date: "16 Sept 2024" },
  { name: "Michael Tan", date: "16 Sept 2024" },
  { name: "Emma Wong", date: "15 Sept 2024" },
  { name: "James Lee", date: "15 Sept 2024" },
  { name: "Olivia Kim", date: "14 Sept 2024" },
  { name: "David Park", date: "14 Sept 2024" },
  { name: "Sophia Liu", date: "13 Sept 2024" },
  { name: "Ryan Zhang", date: "13 Sept 2024" },
  { name: "Mia Johnson", date: "12 Sept 2024" },
  { name: "Alex Chen", date: "12 Sept 2024" },
  { name: "Luna Martinez", date: "11 Sept 2024" },
  { name: "Noah Brown", date: "11 Sept 2024" },
  { name: "Isabella Garcia", date: "10 Sept 2024" },
  { name: "Ethan Wilson", date: "10 Sept 2024" },
  { name: "Ava Anderson", date: "9 Sept 2024" },
  { name: "Liam Taylor", date: "9 Sept 2024" },
  { name: "Charlotte Moore", date: "8 Sept 2024" },
  { name: "Mason Jackson", date: "8 Sept 2024" },
];

export const matchesRound1: MatchPair[] = [
  { a: "Sarah Chen", b: "Michael Tan", score: 99.8, group: "GROUP 1.1", tags: ["romantic"] },
  { a: "Emma Wong", b: "James Lee", score: 98.5, group: "GROUP 1.2", tags: ["romantic"] },
  { a: "Olivia Kim", b: "David Park", score: 97.2, group: "GROUP 1.3", tags: ["romantic"] },
  { a: "Sophia Liu", b: "Ryan Zhang", score: 96.1, group: "GROUP 1.4", tags: ["romantic"] },
  { a: "Mia Johnson", b: "Alex Chen", score: 95.3, group: "GROUP 1.5", tags: ["romantic"] },
  { a: "Luna Martinez", b: "Noah Brown", score: 94.7, group: "GROUP 2.1", tags: ["friend"] },
  { a: "Isabella Garcia", b: "Ethan Wilson", score: 93.9, group: "GROUP 2.2", tags: ["friend"] },
  { a: "Ava Anderson", b: "Liam Taylor", score: 93.2, group: "GROUP 2.3", tags: ["friend"] },
  { a: "Charlotte Moore", b: "Mason Jackson", score: 92.5, group: "GROUP 2.4", tags: ["friend"] },
  { a: "Sarah Chen", b: "Emma Wong", score: 91.8, group: "GROUP 3.1", tags: ["friend"] },
  { a: "Michael Tan", b: "James Lee", score: 91.1, group: "GROUP 3.2", tags: ["friend"] },
  { a: "Olivia Kim", b: "Sophia Liu", score: 90.4, group: "GROUP 3.3", tags: ["friend"] },
  { a: "David Park", b: "Ryan Zhang", score: 89.7, group: "GROUP 3.4", tags: ["friend"] },
  { a: "Mia Johnson", b: "Luna Martinez", score: 89.0, group: "GROUP 3.5", tags: ["friend"] },
  { a: "Alex Chen", b: "Noah Brown", score: 88.3, group: "GROUP 4.1", tags: ["friend"] },
  { a: "Isabella Garcia", b: "Ava Anderson", score: 87.6, group: "GROUP 4.2", tags: ["friend"] },
  { a: "Ethan Wilson", b: "Liam Taylor", score: 86.9, group: "GROUP 4.3", tags: ["friend"] },
  { a: "Charlotte Moore", b: "Sarah Chen", score: 86.2, group: "GROUP 4.4", tags: ["friend"] },
  { a: "Mason Jackson", b: "Michael Tan", score: 85.5, group: "GROUP 4.5", tags: ["friend"] },
  { a: "Emma Wong", b: "Olivia Kim", score: 84.8, group: "GROUP 5.1", tags: ["friend"] },
  { a: "James Lee", b: "David Park", score: 84.1, group: "GROUP 5.2", tags: ["friend"] },
  { a: "Sophia Liu", b: "Mia Johnson", score: 83.4, group: "GROUP 5.3", tags: ["friend"] },
  { a: "Ryan Zhang", b: "Alex Chen", score: 82.7, group: "GROUP 5.4", tags: ["friend"] },
  { a: "Luna Martinez", b: "Isabella Garcia", score: 82.0, group: "GROUP 5.5", tags: ["friend"] },
  { a: "Noah Brown", b: "Ethan Wilson", score: 81.3, group: "GROUP 6.1", tags: ["friend"] },
  { a: "Ava Anderson", b: "Charlotte Moore", score: 80.6, group: "GROUP 6.2", tags: ["friend"] },
  { a: "Liam Taylor", b: "Mason Jackson", score: 79.9, group: "GROUP 6.3", tags: ["friend"] },
  { a: "Sarah Chen", b: "Sophia Liu", score: 79.2, group: "GROUP 6.4", tags: ["friend"] },
  { a: "Michael Tan", b: "Ryan Zhang", score: 78.5, group: "GROUP 6.5", tags: ["friend"] },
];

export const matchingSummary: MatchingSummary = {
  romanticMatched: 5,
  friendMatched: 25,
  calculatedAt: "16 Sept 2024, 14:30",
};

