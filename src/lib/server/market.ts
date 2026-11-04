import "server-only";
import snapshotJson from "@/data/market-snapshot.json";
import { TICKERS, TICKER_MAP } from "@/data/tickers";
import type { ChartRange, MarketSnapshot, PricePoint, Quote } from "@/lib/types";
import { RANGE_DAYS, type PriceMap } from "@/lib/portfolio";
import { config } from "./config";

/**
 * Market data with two modes:
 * - snapshot (default): bundled JSON of real delayed prices, no network.
 * - live: Finnhub quotes if FINNHUB_API_KEY is set, otherwise Yahoo's public
 *   chart endpoint. Cached ≥ 60s. Any failure falls back to the snapshot.
 */
const snapshot = snapshotJson as unknown as MarketSnapshot;

interface CacheEntry {
  at: number;
  quote: Quote;
}
const g = globalThis as unknown as { __sproutQuotes?: Map<string, CacheEntry> };
const cache = (g.__sproutQuotes ??= new Map());

function snapshotQuote(symbol: string): Quote | null {
  const s = snapshot.symbols[symbol];
  const info = TICKER_MAP[symbol];
  if (!s || !info) return null;
  return {
    symbol,
    name: info.name,
    kind: info.kind,
    sector: info.sector,
    price: s.price,
    prevClose: s.prevClose,
    change: Math.round((s.price - s.prevClose) * 100) / 100,
    changePct: ((s.price - s.prevClose) / s.prevClose) * 100,
    high52: s.high52,
    low52: s.low52,
    asOf: snapshot.asOf,
    source: `${snapshot.source} · snapshot`,
    freshness: "snapshot",
  };
}

async function fetchJson(url: string, headers: Record<string, string> = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function liveQuote(symbol: string): Promise<Quote> {
  const base = snapshotQuote(symbol);
  if (!base) throw new Error(`Unknown symbol ${symbol}`);
  if (config.market.finnhubKey) {
    const j = (await fetchJson(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${config.market.finnhubKey}`,
    )) as { c: number; pc: number; t: number };
    if (!j.c) throw new Error("Finnhub returned no price");
    return { ...base, price: j.c, prevClose: j.pc, change: j.c - j.pc, changePct: ((j.c - j.pc) / j.pc) * 100, asOf: j.t * 1000, source: "Finnhub (delayed)", freshness: "live" };
  }
  const j = (await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`, {
    "User-Agent": "Mozilla/5.0 (Sprout)",
  })) as { chart: { result?: Array<{ meta: { regularMarketPrice: number; chartPreviousClose: number; regularMarketTime: number }; indicators: { quote: Array<{ close: Array<number | null> }> } }> } };
  const r = j.chart.result?.[0];
  if (!r) throw new Error("Yahoo returned no result");
  const closes = r.indicators.quote[0].close.filter((c): c is number => typeof c === "number");
  const price = r.meta.regularMarketPrice;
  const prevClose = closes.length > 1 ? closes[closes.length - 2] : r.meta.chartPreviousClose;
  return { ...base, price, prevClose, change: price - prevClose, changePct: ((price - prevClose) / prevClose) * 100, asOf: r.meta.regularMarketTime * 1000, source: "Yahoo Finance (delayed)", freshness: "live" };
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const sym = symbol.toUpperCase();
  if (!TICKER_MAP[sym]) return null;
  if (config.marketMode !== "live") return snapshotQuote(sym);
  const hit = cache.get(sym);
  if (hit && Date.now() - hit.at < config.market.cacheSeconds * 1000) return hit.quote;
  try {
    const quote = await liveQuote(sym);
    cache.set(sym, { at: Date.now(), quote });
    return quote;
  } catch (err) {
    console.warn(`[market] live quote failed for ${sym}, using snapshot`, err);
    return hit?.quote ?? snapshotQuote(sym);
  }
}

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const quotes = await Promise.all(unique.map(getQuote));
  return quotes.filter((q): q is Quote => q !== null);
}

export async function getPriceMap(symbols: string[]): Promise<PriceMap> {
  const quotes = await getQuotes(symbols);
  return Object.fromEntries(quotes.map((q) => [q.symbol, { price: q.price, prevClose: q.prevClose }]));
}

/** History for charts. Always from the snapshot, with the latest price appended in live mode. */
export async function getHistory(symbol: string, range: ChartRange): Promise<PricePoint[]> {
  const sym = symbol.toUpperCase();
  const s = snapshot.symbols[sym];
  if (!s) return [];
  let points: PricePoint[];
  if (range === "1D") {
    points = s.intraday.length > 1 ? s.intraday : s.daily.slice(-2);
  } else {
    const from = snapshot.asOf - RANGE_DAYS[range] * 86_400_000;
    points = s.daily.filter((p) => p.t >= from);
  }
  if (config.marketMode === "live") {
    const q = await getQuote(sym);
    if (q && q.asOf > (points.at(-1)?.t ?? 0)) points = [...points, { t: q.asOf, c: q.price }];
  }
  return points;
}

/** Full daily + intraday series for portfolio reconstruction. */
export function getFullSeries(symbol: string, range: ChartRange): PricePoint[] {
  const s = snapshot.symbols[symbol];
  if (!s) return [];
  return range === "1D" ? s.intraday : s.daily;
}

export function searchTickers(q: string) {
  const query = q.trim().toLowerCase();
  if (!query) return TICKERS;
  return TICKERS.filter(
    (t) =>
      t.symbol.toLowerCase().startsWith(query) ||
      t.name.toLowerCase().includes(query) ||
      t.sector.toLowerCase().includes(query),
  );
}

export function marketAsOf() {
  return snapshot.asOf;
}
