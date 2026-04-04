/**
 * City registry with flag emojis.
 * Single source of truth for city display across the app.
 * Keys match the label stored in the `events.city` column (e.g. "Singapore").
 */

export type CityMeta = {
  /** Matches events.city value in DB (e.g. "Singapore") */
  label: string;
  /** Profile city code used in profileOptions (e.g. "sg") */
  code: string;
  countryCode: string;
  flagEmoji: string;
};

export const CITIES_META: CityMeta[] = [
  { label: "Singapore", code: "sg", countryCode: "SG", flagEmoji: "🇸🇬" },
  { label: "Hong Kong", code: "hk", countryCode: "HK", flagEmoji: "🇭🇰" },
  { label: "Bangkok", code: "bkk", countryCode: "TH", flagEmoji: "🇹🇭" },
  { label: "Kuala Lumpur", code: "kl", countryCode: "MY", flagEmoji: "🇲🇾" },
  { label: "Manila", code: "mnl", countryCode: "PH", flagEmoji: "🇵🇭" },
  { label: "Cebu", code: "ceb", countryCode: "PH", flagEmoji: "🇵🇭" },
  { label: "Bali", code: "bali", countryCode: "ID", flagEmoji: "🇮🇩" },
  { label: "Ho Chi Minh City", code: "hcmc", countryCode: "VN", flagEmoji: "🇻🇳" },
  { label: "Tokyo", code: "tyo", countryCode: "JP", flagEmoji: "🇯🇵" },
];

/** Look up flag emoji for a city label (case-insensitive). Returns "" if unknown. */
export function getCityFlag(city: string): string {
  const lower = city.trim().toLowerCase();
  return CITIES_META.find((c) => c.label.toLowerCase() === lower)?.flagEmoji ?? "";
}

/** Display label with flag, e.g. "🇸🇬 Singapore" */
export function getCityDisplay(city: string): string {
  const flag = getCityFlag(city);
  return flag ? `${flag} ${city}` : city;
}
