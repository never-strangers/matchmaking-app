/**
 * Typed configuration for the unified seed CLI (`scripts/seed.ts`).
 */

export type CheckedInMode =
  | { mode: "all" }
  | { mode: "percent"; value: number }
  | { mode: "late" };

export type QuestionSelection =
  | { selection: "defaults" }
  | { selection: "tags"; tags: string[] }
  | { selection: "random" };

export type SeedConfig = {
  /** Short identifier (slug). Used as seed_run label + output file name. Required. */
  label: string;
  city: string;

  event?: {
    titlePrefix?: string;
    category: "friends" | "dating";
    /** ISO datetime or "+Nd" offset from now (e.g. "+14d") */
    startAt: string;
    /** ISO datetime or "+Nd" offset from now */
    endAt?: string;
    payment: {
      required: boolean;
      priceCents?: number;
      currency?: string;
    };
  };

  users: {
    total: number;
    /** Explicit split. Must sum to total. Omit to use default split. */
    genderSplit?: { female: number; male: number };
    statuses: { approved: number; pending: number; rejected: number };
    includeInstagram?: boolean;
    /** Minimum age in years (default 21) */
    dobMinAge?: number;
    archetypes?: Array<"social_extrovert" | "deep_talker" | "balanced" | "adventurous">;
  };

  attendees?: {
    joinAllApproved: boolean;
    checkedIn: CheckedInMode;
    questionnaire: {
      complete: boolean;
      questionsCount: number;
    } & QuestionSelection;
    paymentStatus?: { paidPercent: number };
  };
};

export const DEFAULT_CONFIG: Partial<SeedConfig> = {
  users: {
    total: 30,
    dobMinAge: 21,
    statuses: { approved: 30, pending: 0, rejected: 0 },
  },
  attendees: {
    joinAllApproved: true,
    checkedIn: { mode: "all" },
    questionnaire: { complete: true, questionsCount: 20, selection: "defaults" },
  },
};

/** Merge CLI overrides on top of a loaded config. */
export function mergeWithDefaults(cfg: Partial<SeedConfig>): SeedConfig {
  const users = { ...DEFAULT_CONFIG.users, ...cfg.users } as SeedConfig["users"];
  const attendees = cfg.attendees
    ? { ...DEFAULT_CONFIG.attendees, ...cfg.attendees } as SeedConfig["attendees"]
    : DEFAULT_CONFIG.attendees as SeedConfig["attendees"];
  return {
    label: cfg.label ?? "",
    city: cfg.city ?? "Bangkok",
    event: cfg.event,
    users,
    attendees,
  };
}

/** Validate a fully-merged config. Returns array of error strings. */
export function validateConfig(cfg: SeedConfig): string[] {
  const errors: string[] = [];

  if (!cfg.label?.trim()) errors.push("label is required");
  if (!cfg.city?.trim()) errors.push("city is required");

  const { total, statuses, genderSplit } = cfg.users;
  const statusSum = (statuses.approved ?? 0) + (statuses.pending ?? 0) + (statuses.rejected ?? 0);
  if (statusSum !== total) {
    errors.push(`users.statuses sum (${statusSum}) must equal users.total (${total})`);
  }
  if (genderSplit) {
    const gSum = (genderSplit.female ?? 0) + (genderSplit.male ?? 0);
    if (gSum > total) {
      errors.push(`genderSplit sum (${gSum}) exceeds users.total (${total})`);
    }
  }

  if (cfg.attendees?.questionnaire?.questionsCount) {
    const qc = cfg.attendees.questionnaire.questionsCount;
    if (qc < 1 || qc > 50) errors.push(`questionsCount must be 1–50`);
  }

  return errors;
}

/** Parse "+Nd" offset strings like "+14d" → ISO datetime */
export function parseStartAt(value: string): string {
  if (!value) return new Date(Date.now() + 14 * 86400_000).toISOString();
  const m = value.match(/^\+(\d+)d$/);
  if (m) {
    return new Date(Date.now() + parseInt(m[1]) * 86400_000).toISOString();
  }
  return value; // assume ISO
}
