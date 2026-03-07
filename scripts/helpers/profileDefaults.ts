/**
 * Shared helpers for seed scripts: normalize and build profile preference fields.
 *
 * Storage format (must match app/api/profile/update/route.ts):
 *   - gender:       TEXT  — "male" | "female" | "other" | "prefer_not_to_say"
 *   - attracted_to: TEXT  — comma-separated "men" | "women" (e.g. "men" or "men,women")
 *   - orientation:  JSONB — { lookingFor: string[] }  (e.g. { lookingFor: ["date"] })
 */

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type AttractedTo = "men" | "women";
export type LookingFor = "date" | "friends";

const VALID_GENDERS = new Set<string>(["male", "female", "other", "prefer_not_to_say"]);
const VALID_ATTRACTED = new Set<string>(["men", "women"]);
const VALID_LOOKING   = new Set<string>(["date", "friends"]);

/** Normalize a gender string to a known DB value, or null. */
export function normalizeGender(value: string | null | undefined): Gender | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (VALID_GENDERS.has(v)) return v as Gender;
  // common aliases
  if (v === "m") return "male";
  if (v === "f") return "female";
  return null;
}

/**
 * Normalize attracted_to to the comma-separated TEXT format the DB expects.
 * Accepts a single value, array, or comma-separated string.
 */
export function normalizeAttractedTo(value: string | string[] | null | undefined): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const valid = raw
    .map((v) => {
      const s = v.trim().toLowerCase();
      if (s === "man") return "men";
      if (s === "woman") return "women";
      return VALID_ATTRACTED.has(s) ? s : null;
    })
    .filter((v): v is string => v !== null);
  return valid.length ? [...new Set(valid)].join(",") : null;
}

/**
 * Normalize looking_for to the JSONB orientation format: { lookingFor: string[] }.
 * Accepts a single value, array, or comma-separated string.
 */
export function normalizeLookingFor(
  value: string | string[] | null | undefined
): { lookingFor: string[] } | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const valid = raw
    .map((v) => {
      const s = v.trim().toLowerCase();
      // common aliases
      if (s === "a_date" || s === "a date") return "date";
      return VALID_LOOKING.has(s) ? s : null;
    })
    .filter((v): v is string => v !== null);
  return valid.length ? { lookingFor: [...new Set(valid)] } : null;
}

/**
 * Build a complete set of seed preference fields for a profile row.
 *
 * Convention for dating seed:
 *   - female → attracted_to: "men", looking_for: "date"
 *   - male   → attracted_to: "women", looking_for: "date"
 */
export function buildSeedPreferences(opts: { gender: Gender }): {
  gender: Gender;
  attracted_to: string;
  orientation: { lookingFor: string[] };
} {
  const { gender } = opts;
  const attracted_to = gender === "female" ? "men" : "women";
  const orientation = { lookingFor: ["date"] };
  return { gender, attracted_to, orientation };
}
