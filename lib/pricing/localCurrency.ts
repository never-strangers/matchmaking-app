import { SEED_ALL_CITIES } from "@/lib/constants/cities";

/**
 * Static FX rates relative to SGD.
 * Update the rates and lastUpdated date periodically — no live API is used.
 */
export const FX_RATES: Record<string, { currency: string; symbol: string; rate: number }> = {
  sg:   { currency: "SGD", symbol: "S$",  rate: 1 },
  hk:   { currency: "HKD", symbol: "HK$", rate: 5.85 },
  bkk:  { currency: "THB", symbol: "฿",   rate: 27.5 },
  kl:   { currency: "MYR", symbol: "RM",  rate: 3.5 },
  mnl:  { currency: "PHP", symbol: "₱",   rate: 44 },
  ceb:  { currency: "PHP", symbol: "₱",   rate: 44 },
  hcmc: { currency: "VND", symbol: "₫",   rate: 19200 },
  bali: { currency: "IDR", symbol: "Rp",  rate: 11900 },
  jkt:  { currency: "IDR", symbol: "Rp",  rate: 11900 },
};

export const FX_LAST_UPDATED = "2025-04-01";

/** Map display labels (as stored on `events.city`) and city codes to `FX_RATES` keys. */
const CITY_LABEL_LOWER_TO_FX_KEY: Record<string, string> = Object.fromEntries(
  SEED_ALL_CITIES.filter((c) => FX_RATES[c.value]).map((c) => [c.label.toLowerCase(), c.value]),
);

function resolveFxKey(city: string | null | undefined): string | undefined {
  if (!city?.trim()) return undefined;
  const t = city.trim().toLowerCase();
  if (FX_RATES[t]) return t;
  return CITY_LABEL_LOWER_TO_FX_KEY[t];
}

/**
 * Returns formatted local price string for a city, or null if city is unknown
 * or the event is free. SGD is returned as-is without conversion note.
 */
export function formatLocalPrice(
  priceCents: number,
  city: string | null | undefined
): { sgd: string; local: string | null; isSameCurrency: boolean } | null {
  if (!priceCents || priceCents <= 0) return null;

  const sgdAmount = priceCents / 100;
  const sgd = `S$${sgdAmount.toFixed(2)} SGD`;

  const fxKey = resolveFxKey(city);
  const fx = fxKey ? FX_RATES[fxKey] : undefined;

  if (!fx || fx.currency === "SGD") {
    return { sgd, local: null, isSameCurrency: true };
  }

  const localAmount = sgdAmount * fx.rate;
  const formatted =
    localAmount >= 1000
      ? `${fx.symbol}${Math.round(localAmount).toLocaleString()} ${fx.currency}`
      : `${fx.symbol}${localAmount.toFixed(0)} ${fx.currency}`;

  return { sgd, local: formatted, isSameCurrency: false };
}
