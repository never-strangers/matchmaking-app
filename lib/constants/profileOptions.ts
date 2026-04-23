export {
  SEED_ALL_CITIES as CITIES,
  CITY_VALUES,
  normalizeCityForSelect,
  cityForFilter,
  type CityOption,
} from "./cities";

export type CityCode = string;

/** Gender options */
export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

export type GenderValue = (typeof GENDERS)[number]["value"];
export const GENDER_VALUES = GENDERS.map((g) => g.value);

/** Attracted to options */
export const ATTRACTED_TO_OPTIONS = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "both", label: "Both" },
] as const;

/** Looking for options (registration) */
export const LOOKING_FOR_OPTIONS = [
  { value: "friends", label: "Friends" },
  { value: "date", label: "A Date" },
] as const;

export type AttractedToValue = (typeof ATTRACTED_TO_OPTIONS)[number]["value"];
export const ATTRACTED_TO_VALUES = ATTRACTED_TO_OPTIONS.map((a) => a.value);

/** Normalize legacy values to select options */
export function normalizeGenderForSelect(g: string | null): string {
  if (!g || !g.trim()) return "";
  const lower = g.trim().toLowerCase();
  return GENDER_VALUES.includes(lower as GenderValue) ? lower : "";
}

export function normalizeAttractedToForSelect(a: string | null): string {
  if (!a || !a.trim()) return "";
  const lower = a.trim().toLowerCase();
  if (lower === "man") return "men";
  if (lower === "woman") return "women";
  if (lower === "men,women" || lower === "women,men") return "both";
  return ATTRACTED_TO_VALUES.includes(lower as AttractedToValue) ? lower : "";
}

/** Convert "both" back to the canonical DB value "men,women" before saving. */
export function attractedToForDB(a: string | null): string | null {
  if (!a) return null;
  if (a === "both") return "men,women";
  return a;
}

/** Minimum age for DOB validation */
export const MIN_AGE = 18;
