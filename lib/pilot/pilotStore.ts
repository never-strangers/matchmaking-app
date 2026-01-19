import { getAllQuestionIds } from "@/lib/questionnaire/questions";
import { AnswerValue, MatchUser, QuestionnaireAnswers } from "@/types/questionnaire";
import { PRESEED_USERS, PilotPreseedUser } from "@/lib/pilot/preseedUsers";

const PILOT_USER_KEY = "ns_pilot_user";
const PILOT_ANSWERS_KEY = "ns_pilot_answers";
const PILOT_OVERRIDES_KEY = "ns_pilot_overrides";

export type PilotSessionUser = {
  email: string;
  name?: string | null;
  city?: string | null;
};

export type PilotUser = {
  id: string;
  name: string;
  email: string;
  city: string;
  answers: QuestionnaireAnswers;
  preseedMatched: boolean;
};

type PilotUserStored = {
  id: string;
  name: string;
  email: string;
  city: string;
  preseedMatched: boolean;
};

type PilotOverrides = Partial<Pick<PilotUserStored, "name" | "city">>;

type PilotUserStorage = {
  currentEmail: string;
  users: Record<string, PilotUserStored>;
};

type PilotAnswersStorage = Record<string, Record<string, unknown>>;
type PilotOverridesStorage = Record<string, PilotOverrides>;

function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toAnswerValue(v: unknown): AnswerValue | null {
  if (v === 1 || v === 2 || v === 3 || v === 4) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (n === 1 || n === 2 || n === 3 || n === 4) return n as AnswerValue;
  }
  return null;
}

function getDefaultAnswers(): QuestionnaireAnswers {
  const ids = getAllQuestionIds();
  const answers: QuestionnaireAnswers = {};
  for (const id of ids) {
    answers[id] = 3;
  }
  return answers;
}

function stableIdFromEmail(email: string): string {
  // Simple deterministic hash (djb2), stable across sessions.
  const s = normalizeEmail(email);
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 33) ^ s.charCodeAt(i);
  }
  return `pilot_${(hash >>> 0).toString(16)}`;
}

export function getPilotUserByEmail(email: string): PilotPreseedUser | null {
  const e = normalizeEmail(email);
  return PRESEED_USERS.find((u) => normalizeEmail(u.email) === e) || null;
}

function normalizePilotUserStored(
  raw: Record<string, unknown>,
  fallbackEmail: string
): PilotUserStored | null {
  const email = normalizeEmail(String(raw.email || fallbackEmail || ""));
  if (!email) return null;

  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : email.split("@")[0]?.replace(/[._-]+/g, " ") || "Pilot User";
  const city =
    typeof raw.city === "string" && raw.city.trim() ? raw.city.trim() : "Singapore";
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : stableIdFromEmail(email);
  const preseedMatched = raw.preseedMatched === true;

  return {
    id,
    name,
    email: typeof raw.email === "string" ? raw.email : email,
    city,
    preseedMatched,
  };
}

function normalizePilotUserStorage(
  parsed: unknown,
  fallbackEmail: string
): PilotUserStorage | null {
  if (!isPlainObject(parsed)) return null;

  // New format: { currentEmail, users }
  if ("users" in parsed || "currentEmail" in parsed) {
    const currentEmail = normalizeEmail(String(parsed.currentEmail || fallbackEmail || ""));
    const usersRaw = isPlainObject(parsed.users) ? (parsed.users as Record<string, unknown>) : {};
    const users: Record<string, PilotUserStored> = {};

    for (const [emailKey, value] of Object.entries(usersRaw)) {
      if (!isPlainObject(value)) continue;
      const u = normalizePilotUserStored(value, emailKey);
      if (!u) continue;
      users[normalizeEmail(emailKey)] = u;
    }

    const resolvedEmail =
      currentEmail || Object.keys(users)[0] || normalizeEmail(fallbackEmail);
    if (!resolvedEmail) return null;

    // Ensure at least one user record exists for resolved email
    if (!users[resolvedEmail]) {
      const u = normalizePilotUserStored({}, resolvedEmail);
      if (u) users[resolvedEmail] = u;
    }

    return { currentEmail: resolvedEmail, users };
  }

  // Legacy format: PilotUserStored-like
  if ("email" in parsed || "id" in parsed || "name" in parsed) {
    const legacy = normalizePilotUserStored(parsed, fallbackEmail);
    if (!legacy) return null;
    const e = normalizeEmail(legacy.email);
    return { currentEmail: e, users: { [e]: legacy } };
  }

  return null;
}

function migrateLegacyPilotStorage(currentEmail: string): void {
  if (typeof window === "undefined") return;
  const email = normalizeEmail(currentEmail);
  if (!email) return;

  // ---- ns_pilot_user ----
  const rawUser = safeJsonParse<unknown>(localStorage.getItem(PILOT_USER_KEY));
  const normalizedUser = normalizePilotUserStorage(rawUser, email);
  if (normalizedUser) {
    writePilotUserStorage(normalizedUser);
  } else if (rawUser !== null) {
    // If it was invalid JSON/object, wipe just the pilot user key (answers can stay).
    localStorage.removeItem(PILOT_USER_KEY);
  }

  // ---- ns_pilot_answers ----
  const rawAnswers = safeJsonParse<unknown>(localStorage.getItem(PILOT_ANSWERS_KEY));
  if (isPlainObject(rawAnswers)) {
    const ids = new Set(getAllQuestionIds());
    const keys = Object.keys(rawAnswers);
    const looksLikeLegacySingle =
      keys.length > 0 &&
      keys.every((k) => ids.has(k)) &&
      keys.some((k) => toAnswerValue((rawAnswers as any)[k]) !== null);

    if (looksLikeLegacySingle) {
      // Wrap legacy { q_id: 1..4 } into { [email]: { q_id: 1..4 } }
      const storage: PilotAnswersStorage = {};
      storage[email] = rawAnswers as Record<string, unknown>;
      writePilotAnswersStorage(storage);
    }
  } else if (rawAnswers !== null && rawAnswers !== undefined) {
    // Non-object garbage, remove
    localStorage.removeItem(PILOT_ANSWERS_KEY);
  }

  // ---- ns_pilot_overrides ----
  const rawOverrides = safeJsonParse<unknown>(localStorage.getItem(PILOT_OVERRIDES_KEY));
  if (isPlainObject(rawOverrides)) {
    const looksLikeLegacySingle =
      "name" in rawOverrides || "city" in rawOverrides;
    const looksLikeMap = Object.values(rawOverrides).some((v) => isPlainObject(v));

    if (looksLikeLegacySingle && !looksLikeMap) {
      const storage: PilotOverridesStorage = {};
      storage[email] = rawOverrides as PilotOverrides;
      writePilotOverridesStorage(storage);
    }
  } else if (rawOverrides !== null && rawOverrides !== undefined) {
    localStorage.removeItem(PILOT_OVERRIDES_KEY);
  }
}

function readPilotUserStorage(): PilotUserStorage | null {
  if (typeof window === "undefined") return null;
  const parsed = safeJsonParse<unknown>(localStorage.getItem(PILOT_USER_KEY));
  return normalizePilotUserStorage(parsed, "");
}

function writePilotUserStorage(storage: PilotUserStorage): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PILOT_USER_KEY, JSON.stringify(storage));
}

function readPilotOverridesStorage(): PilotOverridesStorage {
  if (typeof window === "undefined") return {};
  const parsed = safeJsonParse<unknown>(localStorage.getItem(PILOT_OVERRIDES_KEY));
  if (!isPlainObject(parsed)) return {};
  return parsed as PilotOverridesStorage;
}

function writePilotOverridesStorage(storage: PilotOverridesStorage): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PILOT_OVERRIDES_KEY, JSON.stringify(storage));
}

function readPilotAnswersStorage(): PilotAnswersStorage {
  if (typeof window === "undefined") return {};
  const parsed = safeJsonParse<unknown>(localStorage.getItem(PILOT_ANSWERS_KEY));
  if (!isPlainObject(parsed)) return {};
  return parsed as PilotAnswersStorage;
}

function writePilotAnswersStorage(storage: PilotAnswersStorage): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PILOT_ANSWERS_KEY, JSON.stringify(storage));
}

function getCurrentEmailFromStorage(): string | null {
  const storage = readPilotUserStorage();
  const email = storage?.currentEmail ? normalizeEmail(storage.currentEmail) : null;
  return email || null;
}

function readAnswerOverridesForEmail(email: string): Partial<QuestionnaireAnswers> {
  const e = normalizeEmail(email);
  const store = readPilotAnswersStorage();
  const raw = store[e];
  if (!raw) return {};

  const ids = new Set(getAllQuestionIds());
  const out: Partial<QuestionnaireAnswers> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!ids.has(key)) continue;
    const av = toAnswerValue(value);
    if (av) out[key] = av;
  }
  return out;
}

function writeAnswerOverridesForEmail(email: string, overrides: Partial<QuestionnaireAnswers>): void {
  const e = normalizeEmail(email);
  const store = readPilotAnswersStorage();
  store[e] = overrides as unknown as Record<string, unknown>;
  writePilotAnswersStorage(store);
}

function readOverridesForEmail(email: string): PilotOverrides {
  const e = normalizeEmail(email);
  const store = readPilotOverridesStorage();
  return store[e] || {};
}

function writeOverridesForEmail(email: string, overrides: PilotOverrides): void {
  const e = normalizeEmail(email);
  const store = readPilotOverridesStorage();
  store[e] = overrides;
  writePilotOverridesStorage(store);
}

export function ensurePilotProfile(sessionUser: PilotSessionUser): PilotUser {
  if (typeof window === "undefined") {
    // Server-safe fallback (should not be relied on for pilot UI)
    const email = normalizeEmail(sessionUser.email);
    return {
      id: stableIdFromEmail(email),
      name: sessionUser.name || "Pilot User",
      email,
      city: sessionUser.city || "Singapore",
      answers: getDefaultAnswers(),
      preseedMatched: false,
    };
  }

  const email = normalizeEmail(sessionUser.email);
  // Migrate older single-user pilot storage → new per-email maps
  migrateLegacyPilotStorage(email);

  const preseed = getPilotUserByEmail(email);

  const storage: PilotUserStorage =
    readPilotUserStorage() || { currentEmail: email, users: {} };
  if (!storage.users) storage.users = {};

  // Create/update baseline user record for this email (do NOT wipe others).
  const baseUser: PilotUserStored = preseed
    ? {
        id: preseed.id,
        name: preseed.name,
        email: preseed.email,
        city: preseed.city,
        preseedMatched: true,
      }
    : {
        id: stableIdFromEmail(email),
        name:
          sessionUser.name?.trim() ||
          email.split("@")[0]?.replace(/[._-]+/g, " ") ||
          "Pilot User",
        email,
        city: sessionUser.city?.trim() || "Singapore",
        preseedMatched: false,
      };

  storage.users[email] = {
    ...storage.users[email],
    ...baseUser,
  };
  storage.currentEmail = email;
  writePilotUserStorage(storage);

  // Ensure per-email entries exist (do not overwrite)
  const overridesStore = readPilotOverridesStorage();
  if (!overridesStore[email]) {
    overridesStore[email] = {};
    writePilotOverridesStorage(overridesStore);
  }
  const answersStore = readPilotAnswersStorage();
  if (!answersStore[email]) {
    answersStore[email] = {};
    writePilotAnswersStorage(answersStore);
  }

  return getCurrentPilotUser()!;
}

export function getCurrentPilotUser(): PilotUser | null {
  if (typeof window === "undefined") return null;

  const storage = readPilotUserStorage();
  const email = storage?.currentEmail ? normalizeEmail(storage.currentEmail) : null;
  if (!storage || !email) return null;

  const stored = storage.users[email];
  if (!stored) return null;

  const overrides = readOverridesForEmail(email);
  const answerOverrides = readAnswerOverridesForEmail(email);

  const preseed = stored.preseedMatched ? getPilotUserByEmail(stored.email) : null;
  const baseAnswers = preseed?.answers || getDefaultAnswers();

  // TS note: spreading `Partial<QuestionnaireAnswers>` widens values to `AnswerValue | undefined`.
  // We know `baseAnswers` is complete, so merge overrides only when defined.
  const mergedAnswers: QuestionnaireAnswers = { ...baseAnswers };
  for (const [key, value] of Object.entries(answerOverrides)) {
    if (!value) continue;
    mergedAnswers[key] = value;
  }

  return {
    id: stored.id,
    name: overrides.name || stored.name,
    email: stored.email,
    city: overrides.city || stored.city,
    answers: mergedAnswers,
    preseedMatched: stored.preseedMatched,
  };
}

export function setCurrentPilotUserAnswers(
  patch: Partial<Record<string, 1 | 2 | 3 | 4>>
): PilotUser | null {
  if (typeof window === "undefined") return null;

  const email = getCurrentEmailFromStorage();
  if (!email) return null;

  const current = getCurrentPilotUser();
  if (!current) return null;

  const existing = readAnswerOverridesForEmail(email);
  const ids = new Set(getAllQuestionIds());

  const next: Partial<QuestionnaireAnswers> = { ...existing };
  for (const [key, value] of Object.entries(patch)) {
    if (!ids.has(key)) continue;
    const av = toAnswerValue(value);
    if (!av) continue;
    next[key] = av;
  }

  writeAnswerOverridesForEmail(email, next);
  return getCurrentPilotUser();
}

export function resetPilotData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PILOT_USER_KEY);
  localStorage.removeItem(PILOT_ANSWERS_KEY);
  localStorage.removeItem(PILOT_OVERRIDES_KEY);
}

export function getPilotCandidates(): MatchUser[] {
  return PRESEED_USERS.map((u) => ({
    id: u.id,
    name: u.name,
    city: u.city,
    answers: u.answers,
  }));
}

