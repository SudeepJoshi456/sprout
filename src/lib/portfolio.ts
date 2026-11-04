/**
 * Practice investing rules (pure functions, shared by client and server).
 * Amounts are Sprout Seeds in cents; shares are rounded to 6 decimals.
 */
import { TICKER_MAP } from "@/data/tickers";
import type { ChartRange, Holding, Portfolio, PricePoint, Trade } from "./types";

export const STARTING_SEEDS_CENTS = 1_000_000; // 10,000.00 Seeds
export const MIN_TRADE_CENTS = 100; // 1.00 Seed

export type PriceMap = Record<string, { price: number; prevClose: number }>;

export function roundShares(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

export interface HoldingView extends Holding {
  name: string;
  kind: "etf" | "stock";
  price: number;
  valueCents: number;
  gainCents: number;
  gainPct: number;
  dayChangeCents: number;
  weight: number; // share of invested value, 0..1
}

export interface PortfolioView {
  cashCents: number;
  investedCents: number;
  totalCents: number;
  totalGainCents: number;
  totalGainPct: number;
  dayChangeCents: number;
  dayChangePct: number;
  holdings: HoldingView[];
}

/**
 * `heldSinceToday` lets day change use purchase price for positions opened
 * today (so a buy at $100 isn't shown as a gain vs. yesterday's close).
 */
export function valuePortfolio(p: Portfolio, prices: PriceMap, now = new Date()): PortfolioView {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const holdings = p.holdings
    .filter((h) => h.shares > 0)
    .map((h) => {
      const q = prices[h.symbol];
      const price = q?.price ?? 0;
      const valueCents = Math.round(h.shares * price * 100);
      const gainCents = valueCents - h.costBasisCents;
      // Shares bought today change from their purchase price, not yesterday's close.
      const boughtToday = p.trades
        .filter((t) => t.symbol === h.symbol && new Date(t.at) >= startOfToday)
        .reduce((s, t) => s + (t.side === "buy" ? t.shares : -t.shares), 0);
      const olderShares = Math.max(0, h.shares - Math.max(0, boughtToday));
      const todayBuys = p.trades.filter((t) => t.symbol === h.symbol && t.side === "buy" && new Date(t.at) >= startOfToday);
      const todayBuyChange = todayBuys.reduce((s, t) => s + t.shares * (price - t.price), 0);
      const dayChangeCents = Math.round((olderShares * (price - (q?.prevClose ?? price)) + todayBuyChange) * 100);
      const info = TICKER_MAP[h.symbol];
      return {
        ...h,
        name: info?.name ?? h.symbol,
        kind: info?.kind ?? "stock",
        price,
        valueCents,
        gainCents,
        gainPct: h.costBasisCents > 0 ? (gainCents / h.costBasisCents) * 100 : 0,
        dayChangeCents,
        weight: 0,
      };
    })
    .sort((a, b) => b.valueCents - a.valueCents);
  const investedCents = holdings.reduce((s, h) => s + h.valueCents, 0);
  holdings.forEach((h) => (h.weight = investedCents > 0 ? h.valueCents / investedCents : 0));
  const totalCents = p.cashCents + investedCents;
  const dayChangeCents = holdings.reduce((s, h) => s + h.dayChangeCents, 0);
  const totalGainCents = totalCents - STARTING_SEEDS_CENTS;
  return {
    cashCents: p.cashCents,
    investedCents,
    totalCents,
    totalGainCents,
    totalGainPct: (totalGainCents / STARTING_SEEDS_CENTS) * 100,
    dayChangeCents,
    dayChangePct: totalCents - dayChangeCents > 0 ? (dayChangeCents / (totalCents - dayChangeCents)) * 100 : 0,
    holdings,
  };
}

export type DiversificationLevel = "none" | "concentrated" | "some" | "well";

export interface Diversification {
  level: DiversificationLevel;
  /** 0..100 for the meter. */
  score: number;
  largestSymbol: string | null;
  largestPct: number;
  count: number;
  /** True when the largest holding is a broad fund (diversified on its own). */
  largestIsFund: boolean;
}

/**
 * Diversification uses the share held by the largest position and the number
 * of positions. Broad index funds already hold hundreds of companies, so a
 * portfolio that's mostly in one is treated as spread out.
 */
export function diversification(view: PortfolioView): Diversification {
  const count = view.holdings.length;
  if (count === 0) return { level: "none", score: 0, largestSymbol: null, largestPct: 0, count, largestIsFund: false };
  const top = view.holdings[0];
  const largestPct = Math.round(top.weight * 100);
  const fundWeight = view.holdings.filter((h) => h.kind === "etf" && h.symbol !== "BND").reduce((s, h) => s + h.weight, 0);
  const largestIsFund = top.kind === "etf";
  let score = Math.min(100, Math.round((1 - top.weight) * 70 + Math.min(count, 6) * 5));
  score = Math.max(score, Math.round(fundWeight * 85));
  let level: DiversificationLevel;
  if (fundWeight >= 0.6 || (count >= 5 && top.weight <= 0.3)) level = "well";
  else if (top.weight >= 0.5) level = "concentrated";
  else level = "some";
  if (level === "well") score = Math.max(score, 75);
  if (level === "concentrated") score = Math.min(score, 35);
  return { level, score, largestSymbol: top.symbol, largestPct, count, largestIsFund };
}

export type TradeError = "amount_invalid" | "below_minimum" | "insufficient_seeds" | "exceeds_position" | "no_price";

export function validateTrade(
  p: Portfolio,
  side: "buy" | "sell",
  symbol: string,
  amountCents: number,
  price: number | undefined,
): TradeError | null {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return "amount_invalid";
  if (amountCents < MIN_TRADE_CENTS) return "below_minimum";
  if (!price || price <= 0) return "no_price";
  if (side === "buy" && amountCents > p.cashCents) return "insufficient_seeds";
  if (side === "sell") {
    const h = p.holdings.find((x) => x.symbol === symbol);
    const positionCents = h ? Math.floor(h.shares * price * 100) : 0;
    if (amountCents > positionCents) return "exceeds_position";
  }
  return null;
}

export function applyTrade(p: Portfolio, trade: Trade): Portfolio {
  const holdings = p.holdings.map((h) => ({ ...h }));
  let h = holdings.find((x) => x.symbol === trade.symbol);
  if (!h) {
    h = { symbol: trade.symbol, shares: 0, costBasisCents: 0 };
    holdings.push(h);
  }
  if (trade.side === "buy") {
    h.shares = roundShares(h.shares + trade.shares);
    h.costBasisCents += trade.amountCents;
    return { ...p, cashCents: p.cashCents - trade.amountCents, holdings, trades: [trade, ...p.trades] };
  }
  const fraction = h.shares > 0 ? Math.min(1, trade.shares / h.shares) : 1;
  h.costBasisCents = Math.round(h.costBasisCents * (1 - fraction));
  h.shares = roundShares(h.shares - trade.shares);
  // Treat dust as a closed position.
  const kept = holdings.filter((x) => x.shares > 0.000001);
  return { ...p, cashCents: p.cashCents + trade.amountCents, holdings: kept, trades: [trade, ...p.trades] };
}

/** Days since the first practice trade (feeds the Graduate card). */
export function practiceDays(p: Portfolio, now = new Date()) {
  if (p.trades.length === 0) return 0;
  const first = p.trades.reduce((min, t) => (t.at < min ? t.at : min), p.trades[0].at);
  return Math.max(0, Math.floor((now.getTime() - new Date(first).getTime()) / 86_400_000));
}

export const RANGE_DAYS: Record<ChartRange, number> = { "1D": 1, "1W": 7, "1M": 31, "1Y": 366 };

/**
 * Rebuilds portfolio value over time from trades and price history.
 * `histories` must contain a series for each symbol ever traded.
 */
export function portfolioSeries(
  p: Portfolio,
  histories: Record<string, PricePoint[]>,
  currentPrices: PriceMap,
  range: ChartRange,
  now = Date.now(),
): PricePoint[] {
  const symbols = Object.keys(histories);
  // Timeline = union of timestamps across symbols within the range (or a flat line).
  const from = now - RANGE_DAYS[range] * 86_400_000;
  const stamps = new Set<number>();
  for (const s of symbols) for (const pt of histories[s]) if (pt.t >= from) stamps.add(pt.t);
  if (stamps.size === 0) stamps.add(from);
  stamps.add(now);
  const timeline = [...stamps].sort((a, b) => a - b);
  const trades = [...p.trades].sort((a, b) => a.at.localeCompare(b.at));
  const cursor: Record<string, number> = {};
  return timeline.map((t) => {
    let cash = STARTING_SEEDS_CENTS;
    const shares: Record<string, number> = {};
    for (const tr of trades) {
      if (new Date(tr.at).getTime() > t) break;
      cash += tr.side === "buy" ? -tr.amountCents : tr.amountCents;
      shares[tr.symbol] = (shares[tr.symbol] ?? 0) + (tr.side === "buy" ? tr.shares : -tr.shares);
    }
    let value = cash;
    for (const [sym, n] of Object.entries(shares)) {
      if (n <= 0) continue;
      const series = histories[sym] ?? [];
      let i = cursor[sym] ?? 0;
      while (i + 1 < series.length && series[i + 1].t <= t) i++;
      cursor[sym] = i;
      const fallback = series[i]?.c ?? currentPrices[sym]?.price ?? 0;
      const price = t === now ? currentPrices[sym]?.price ?? fallback : fallback;
      value += Math.round(n * price * 100);
    }
    return { t, c: value / 100 };
  });
}
