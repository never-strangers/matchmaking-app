/**
 * Shared validation and options for onboarding + profile.
 * Used by registration form, profile page, and API routes.
 */

export const MIN_AGE = 21;
export const AGE_ERROR_MESSAGE =
  "You must be 21+ to join Never Strangers.";

/** Normalized gender values stored in DB; display labels for UI. */
export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "others", label: "Others" },
] as const;

export type GenderValue = (typeof GENDER_OPTIONS)[number]["value"];

/** Preferred language options (include Thai & Vietnamese). */
export const PREFERRED_LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "th", label: "Thai" },
  { value: "vi", label: "Vietnamese" },
  // Add more as needed
] as const;

export type PreferredLanguageValue =
  (typeof PREFERRED_LANGUAGE_OPTIONS)[number]["value"];

/**
 * Returns true if the given date of birth means the user is at least MIN_AGE today.
 * dob can be YYYY-MM-DD string or Date.
 */
export function isAtLeast21(dob: string | Date): boolean {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return age >= MIN_AGE;
}

/**
 * Parse common date inputs to YYYY-MM-DD for storage and validation.
 * Accepts: yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy (and short forms like d/m/yyyy).
 * Returns null if unparseable.
 */
export function parseDateOfBirth(input: string | null | undefined): string | null {
  if (input == null || (input = String(input).trim()) === "") return null;
  // Already ISO-like (yyyy-mm-dd)
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input);
  if (iso) {
    const [, y, m, d] = iso;
    const month = Number(m);
    const day = Number(d);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(input);
  if (dmy) {
    const [, d, m, y] = dmy;
    const month = Number(m);
    const day = Number(d);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  // Fallback: let Date parse (handles some other formats)
  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return null;
}

/**
 * Validates DOB for 21+ requirement. Returns error message or null if valid.
 * Accepts common formats (yyyy-mm-dd, dd/mm/yyyy); normalizes before validating.
 */
export function validateDob21Plus(dob: string | null | undefined): string | null {
  if (dob == null || String(dob).trim() === "") {
    return "Date of birth is required.";
  }
  const normalized = parseDateOfBirth(dob) ?? dob;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) {
    return "Please enter a valid date of birth (e.g. 1995-06-15 or 15/06/1995).";
  }
  if (!isAtLeast21(normalized)) {
    return AGE_ERROR_MESSAGE;
  }
  return null;
}

/** Normalize gender for storage (lowercase, allow only known values). */
export function normalizeGender(
  value: string | null | undefined
): GenderValue | null {
  if (value == null || value === "") return null;
  const lower = value.toLowerCase().trim();
  if (lower === "male" || lower === "female" || lower === "others")
    return lower as GenderValue;
  return null;
}
