/** Predefined cities (stored as code, displayed as label) */
export const CITIES = [
  { value: "sg", label: "Singapore" },
  { value: "hk", label: "Hong Kong" },
  { value: "bkk", label: "Bangkok" },
  { value: "kl", label: "Kuala Lumpur" },
  { value: "mnl", label: "Manila" },
  { value: "ceb", label: "Cebu" },
  { value: "bali", label: "Bali" },
  { value: "hcmc", label: "Ho Chi Minh City" },
  { value: "jkt", label: "Jakarta" },
] as const;

export type CityCode = (typeof CITIES)[number]["value"];
export const CITY_VALUES = CITIES.map((c) => c.value);

/** Map legacy full names to city code for backwards compatibility */
const LABEL_TO_CODE: Record<string, CityCode> = Object.fromEntries(
  CITIES.map((c) => [c.label.toLowerCase(), c.value])
);
/** Map city code to display label (for DB queries where events use labels e.g. "Singapore") */
const CODE_TO_LABEL: Record<CityCode, string> = Object.fromEntries(
  CITIES.map((c) => [c.value, c.label])
) as Record<CityCode, string>;

export function normalizeCityForSelect(city: string | null): string {
  if (!city || !city.trim()) return "";
  const code = CITY_VALUES.find((v) => v === city.trim());
  if (code) return code;
  const byLabel = LABEL_TO_CODE[city.trim().toLowerCase()];
  return byLabel ?? "";
}

/**
 * Return a canonical city value for filtering (e.g. events by city).
 * Converts codes ("sg") to labels ("Singapore") so profile city matches event city in DB.
 */
export function cityForFilter(city: string | null): string | null {
  if (!city || !city.trim()) return null;
  const trimmed = city.trim();
  const code = CITY_VALUES.find((v) => v === trimmed);
  if (code) return CODE_TO_LABEL[code] ?? trimmed;
  if (CITIES.some((c) => c.label === trimmed)) return trimmed;
  return trimmed;
}

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
  return ATTRACTED_TO_VALUES.includes(lower as AttractedToValue) ? lower : "";
}

/** Minimum age for DOB validation */
export const MIN_AGE = 18;
