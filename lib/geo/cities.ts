import { SEED_ALL_CITIES } from "@/lib/constants/cities";

export type CityMeta = {
  /** Matches events.city value in DB (e.g. "Singapore") */
  label: string;
  /** Profile city code used in profileOptions (e.g. "sg") */
  code: string;
  countryCode: string;
  flagEmoji: string;
};

const FLAG_MAP: Record<string, { countryCode: string; flagEmoji: string }> = {
  sg:   { countryCode: "SG", flagEmoji: "🇸🇬" },
  hk:   { countryCode: "HK", flagEmoji: "🇭🇰" },
  bkk:  { countryCode: "TH", flagEmoji: "🇹🇭" },
  kl:   { countryCode: "MY", flagEmoji: "🇲🇾" },
  mnl:  { countryCode: "PH", flagEmoji: "🇵🇭" },
  ceb:  { countryCode: "PH", flagEmoji: "🇵🇭" },
  hcmc: { countryCode: "VN", flagEmoji: "🇻🇳" },
  bali: { countryCode: "ID", flagEmoji: "🇮🇩" },
  jkt:  { countryCode: "ID", flagEmoji: "🇮🇩" },
};

export const CITIES_META: CityMeta[] = SEED_ALL_CITIES.map((c) => ({
  label: c.label,
  code: c.value,
  countryCode: FLAG_MAP[c.value]?.countryCode ?? "",
  flagEmoji: FLAG_MAP[c.value]?.flagEmoji ?? "",
}));

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
