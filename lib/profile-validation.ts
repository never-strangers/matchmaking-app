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
 * Validates DOB for 21+ requirement. Returns error message or null if valid.
 */
export function validateDob21Plus(dob: string | null | undefined): string | null {
  if (dob == null || String(dob).trim() === "") {
    return "Date of birth is required.";
  }
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) {
    return "Please enter a valid date of birth.";
  }
  if (!isAtLeast21(dob)) {
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
