/**
 * Locale-aware formatting helpers. All money values are integer cents.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCALE_BY_CURRENCY: Record<string, string> = {
  USD: "en-US",
  INR: "en-IN", // lakh grouping: ₹1,25,000
  NPR: "en-IN", // lakh grouping: NPR 3,00,000
  EUR: "en-IE",
  GBP: "en-GB",
  MXN: "es-MX",
};

const nfCache = new Map<string, Intl.NumberFormat>();
function nf(key: string, locale: string, opts: Intl.NumberFormatOptions) {
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, opts);
    nfCache.set(key, f);
  }
  return f;
}

export interface MoneyOpts {
  currency?: string;
  /** Prefix "+" for positive values; negatives always use a true minus sign. */
  signed?: boolean;
  /** Drop cents for whole amounts (e.g. "$950"). */
  trimZeroCents?: boolean;
  /** Abbreviate large numbers ("$12.4K"). Only use where space is tight. */
  compact?: boolean;
}

export function formatMoney(cents: number, opts: MoneyOpts = {}): string {
  const currency = opts.currency ?? "USD";
  const locale = LOCALE_BY_CURRENCY[currency] ?? "en-US";
  const value = Math.abs(cents) / 100;
  const whole = Number.isInteger(value);
  const digits = opts.trimZeroCents && whole ? 0 : 2;
  const key = `${currency}:${digits}:${opts.compact ? "c" : ""}`;
  const formatted = nf(key, locale, {
    style: "currency",
    currency,
    minimumFractionDigits: opts.compact ? 0 : digits,
    maximumFractionDigits: opts.compact ? 1 : digits,
    notation: opts.compact && value >= 10_000 ? "compact" : "standard",
  }).format(value);
  if (cents < 0) return `−${formatted}`;
  if (opts.signed && cents > 0) return `+${formatted}`;
  return formatted;
}

/** Money in a non-USD minor-unit amount, e.g. NPR paisa. */
export function formatForeign(minor: number, currency: string) {
  return formatMoney(minor, { currency, trimZeroCents: true });
}

export function formatPercent(pct: number, opts: { signed?: boolean; digits?: number } = {}) {
  const digits = opts.digits ?? 1;
  const abs = Math.abs(pct).toFixed(digits);
  if (pct < 0) return `−${abs}%`;
  if (opts.signed && pct > 0) return `+${abs}%`;
  return `${abs}%`;
}

export function formatShares(shares: number) {
  return nf("shares", "en-US", { maximumFractionDigits: 6, minimumFractionDigits: 0 }).format(shares);
}

export function formatPrice(price: number) {
  return formatMoney(Math.round(price * 100));
}

/** Unambiguous dates: "Nov 3, 2026". Never 11/03/26. */
export function formatDate(iso: string | number | Date, opts: { withYear?: boolean } = {}) {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: opts.withYear || !sameYear ? "numeric" : undefined,
  });
}

export function formatDateTime(iso: string | number | Date) {
  const d = new Date(iso);
  return `${formatDate(d, { withYear: true })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export function formatTime(iso: string | number | Date) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "Today", "Yesterday", or "Mon, Oct 27" for transaction group headers. */
export function formatDayHeader(iso: string) {
  const d = new Date(iso);
  const today = startOfDay(new Date());
  const diff = Math.round((today.getTime() - startOfDay(d).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Milliseconds from now until `iso` (negative if it's in the past). */
export function msFromNow(iso: string) {
  return Date.parse(iso) - Date.now();
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

/** "in 3 days", "tomorrow", "today", "2 days ago" */
export function relativeDays(iso: string) {
  const diff = daysBetween(new Date(), new Date(iso));
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 1) return `in ${diff} days`;
  return `${-diff} days ago`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** Parses a user-typed dollar string ("1,250.5") into cents. Returns null if invalid. */
export function parseDollarsToCents(input: string): number | null {
  const clean = input.replace(/[,\s$]/g, "");
  if (!/^\d*(\.\d{0,2})?$/.test(clean) || clean === "" || clean === ".") return null;
  return Math.round(parseFloat(clean) * 100);
}
