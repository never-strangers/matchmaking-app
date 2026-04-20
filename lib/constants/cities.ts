export type CityOption = { value: string; label: string; status: "live" | "coming_soon" };

export const SEED_LIVE_CITIES: CityOption[] = [
  { value: "sg",   label: "Singapore",        status: "live" },
  { value: "hk",   label: "Hong Kong",         status: "live" },
  { value: "bkk",  label: "Bangkok",           status: "live" },
  { value: "kl",   label: "Kuala Lumpur",      status: "live" },
  { value: "mnl",  label: "Manila",            status: "live" },
  { value: "ceb",  label: "Cebu",              status: "live" },
  { value: "hcmc", label: "Ho Chi Minh City",  status: "live" },
];

export const SEED_COMING_SOON_CITIES: CityOption[] = [
  { value: "bali", label: "Bali",    status: "coming_soon" },
  { value: "jkt",  label: "Jakarta", status: "coming_soon" },
  { value: "tyo",  label: "Tokyo",   status: "coming_soon" },
];

export const SEED_ALL_CITIES: CityOption[] = [
  ...SEED_LIVE_CITIES,
  ...SEED_COMING_SOON_CITIES,
];

// ── Re-exports for existing consumers ────────────────────────────────────────

export const CITY_VALUES: string[] = SEED_ALL_CITIES.map((c) => c.value);

const LABEL_TO_CODE: Record<string, string> = Object.fromEntries(
  SEED_ALL_CITIES.map((c) => [c.label.toLowerCase(), c.value])
);

const CODE_TO_LABEL: Record<string, string> = Object.fromEntries(
  SEED_ALL_CITIES.map((c) => [c.value, c.label])
);

export function normalizeCityForSelect(city: string | null): string {
  if (!city?.trim()) return "";
  const trimmed = city.trim();
  if (CITY_VALUES.includes(trimmed)) return trimmed;
  return LABEL_TO_CODE[trimmed.toLowerCase()] ?? "";
}

export function cityForFilter(city: string | null): string | null {
  if (!city?.trim()) return null;
  const trimmed = city.trim();
  if (CITY_VALUES.includes(trimmed)) return CODE_TO_LABEL[trimmed] ?? trimmed;
  if (SEED_ALL_CITIES.some((c) => c.label === trimmed)) return trimmed;
  return trimmed;
}
