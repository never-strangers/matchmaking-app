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
};

export const FX_LAST_UPDATED = "2025-04-01";

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

  const cityKey = (city ?? "").toLowerCase();
  const fx = FX_RATES[cityKey];

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
