import { QuestionnaireAnswers } from "@/types/questionnaire";
import { getAllQuestionIds } from "@/lib/questionnaire/questions";

export interface PilotPreseedUser {
  id: string; // stable
  name: string;
  email: string;
  city: "Singapore";
  answers: QuestionnaireAnswers;
}

type Answer = 1 | 2 | 3 | 4;

function clampToAnswer(n: number): Answer {
  if (n <= 1) return 1;
  if (n >= 4) return 4;
  return n as Answer;
}

function buildAnswers(base: Partial<QuestionnaireAnswers>): QuestionnaireAnswers {
  const ids = getAllQuestionIds();
  const answers: QuestionnaireAnswers = {};

  // Default everything to neutral-ish (Agree = 3), then override
  for (const id of ids) {
    answers[id] = 3;
  }

  for (const [id, value] of Object.entries(base)) {
    if (!ids.includes(id)) continue;
    answers[id] = value as Answer;
  }

  // Keep dealbreakers in a tight band to avoid mass-exclusion in demos
  // (this makes the demo feel “always has matches” and deterministic)
  answers["q_lifestyle_1"] = answers["q_lifestyle_1"] ? clampToAnswer(answers["q_lifestyle_1"]) : 3;
  answers["q_lifestyle_2"] = answers["q_lifestyle_2"] ? clampToAnswer(answers["q_lifestyle_2"]) : 2;

  // Hard enforce dealbreaker band
  answers["q_lifestyle_1"] = (answers["q_lifestyle_1"] >= 4 ? 4 : 3) as Answer;
  answers["q_lifestyle_2"] = (answers["q_lifestyle_2"] >= 3 ? 3 : 2) as Answer;

  return answers;
}

/**
 * Pilot preseed dataset (~30 users) for internal matching demos.
 *
 * Notes:
 * - Emails are intentionally easy to edit in-place. Replace with real internal emails.
 * - All users are in Singapore to keep the pilot flow simple and deterministic.
 * - Answers cover ALL question IDs and avoid dealbreaker mass-exclusion.
 */
export const PRESEED_USERS: PilotPreseedUser[] = (() => {
  const archetypes: Array<{
    label: string;
    base: Partial<QuestionnaireAnswers>;
  }> = [
    {
      label: "Extroverted networker",
      base: {
        q_lifestyle_1: 4,
        q_lifestyle_2: 2,
        q_social_1: 4,
        q_social_3: 4,
        q_social_4: 2,
        q_values_2: 3,
        q_comm_2: 4,
      },
    },
    {
      label: "Cozy introvert",
      base: {
        q_lifestyle_1: 3,
        q_lifestyle_2: 3,
        q_lifestyle_5: 4,
        q_social_1: 2,
        q_social_4: 4,
        q_values_3: 4,
        q_comm_1: 3,
      },
    },
    {
      label: "Values-driven",
      base: {
        q_lifestyle_1: 3,
        q_lifestyle_2: 2,
        q_values_1: 4,
        q_values_2: 4,
        q_values_3: 4,
        q_values_4: 3,
        q_comm_2: 4,
      },
    },
    {
      label: "Community builder",
      base: {
        q_lifestyle_1: 4,
        q_lifestyle_2: 2,
        q_social_2: 4,
        q_social_4: 4,
        q_values_4: 4,
        q_values_1: 4,
        q_comm_3: 3,
      },
    },
    {
      label: "Direct communicator",
      base: {
        q_lifestyle_1: 3,
        q_lifestyle_2: 3,
        q_comm_2: 4,
        q_comm_3: 4,
        q_comm_1: 2,
        q_values_1: 4,
      },
    },
  ];

  const names = [
    "Aisha Tan",
    "Ben Lim",
    "Chloe Wong",
    "Daniel Lee",
    "Evelyn Koh",
    "Farhan Aziz",
    "Grace Ong",
    "Hannah Goh",
    "Ivan Chua",
    "Jasmine Ng",
    "Kai Chen",
    "Lina Sato",
    "Marcus Teo",
    "Natalie Low",
    "Oliver Tan",
    "Priya Nair",
    "Quinn Ho",
    "Ravi Menon",
    "Samantha Yu",
    "Theo Sim",
    "Uma Patel",
    "Victor Lau",
    "Wen Jie",
    "Xinyi Zhao",
    "Yasmin Ali",
    "Zachary Neo",
    "Alicia Tay",
    "Brandon Goh",
    "Cynthia Lim",
    "Darren Ng",
  ];

  return names.map((name, idx) => {
    const archetype = archetypes[idx % archetypes.length];
    const variant = Math.floor(idx / archetypes.length); // 0..5

    // Deterministic, subtle per-user variation (\(\pm 1\)) on a few dimensions.
    // Keeps matches interesting while still “always has results”.
    const tweak = (v: number, delta: number) => clampToAnswer(v + delta);
    const delta = variant % 2 === 0 ? 1 : -1;

    const base = buildAnswers(archetype.base);
    const tweaked: QuestionnaireAnswers = { ...base };

    // Apply deterministic tweaks on non-dealbreaker questions
    const tweakableIds = [
      "q_lifestyle_3",
      "q_lifestyle_4",
      "q_lifestyle_5",
      "q_social_1",
      "q_social_2",
      "q_social_3",
      "q_social_4",
      "q_values_1",
      "q_values_2",
      "q_values_3",
      "q_values_4",
      "q_comm_1",
      "q_comm_2",
      "q_comm_3",
    ] as const;

    // Tweak 3 stable positions per user
    const pick1 = tweakableIds[(idx + 2) % tweakableIds.length];
    const pick2 = tweakableIds[(idx + 7) % tweakableIds.length];
    const pick3 = tweakableIds[(idx + 11) % tweakableIds.length];
    for (const qId of [pick1, pick2, pick3]) {
      const current = tweaked[qId] || 3;
      tweaked[qId] = tweak(current, delta);
    }

    return {
      id: `pilot_${String(idx + 1).padStart(2, "0")}`,
      name,
      email: `pilot${String(idx + 1).padStart(2, "0")}@example.com`,
      city: "Singapore",
      answers: tweaked,
    } satisfies PilotPreseedUser;
  });
})();

