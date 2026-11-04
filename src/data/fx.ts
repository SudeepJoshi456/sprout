/**
 * Reference exchange rates (units per 1 USD), mid-market, captured Oct 30, 2026.
 * Used for the "≈ home currency" display and mock cross-currency quotes.
 * Interledger mode uses the rate returned by the real quote instead.
 */
export const FX_AS_OF = "2026-10-30";

export const FX_PER_USD: Record<string, number> = {
  USD: 1,
  NPR: 151.9, // pegged at 1.6 INR
  INR: 94.94,
  EUR: 0.8955,
  MXN: 18.793,
  GBP: 0.7463,
  NGN: 1344.94,
  PHP: 63.645,
};

export const CURRENCY_NAMES: Record<string, string> = {
  USD: "US dollar",
  NPR: "Nepalese rupee",
  INR: "Indian rupee",
  EUR: "Euro",
  MXN: "Mexican peso",
  GBP: "British pound",
  NGN: "Nigerian naira",
  PHP: "Philippine peso",
};

/** Converts USD cents to another currency's minor units at the reference rate. */
export function usdToForeign(cents: number, currency: string) {
  const rate = FX_PER_USD[currency] ?? 1;
  return Math.round(cents * rate);
}

export function foreignToUsd(minor: number, currency: string) {
  const rate = FX_PER_USD[currency] ?? 1;
  return Math.round(minor / rate);
}
