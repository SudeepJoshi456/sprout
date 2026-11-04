/**
 * Builds src/data/market-snapshot.json from Yahoo Finance's public chart API.
 *
 *   npm run snapshot
 *
 * The snapshot is what MARKET_MODE=snapshot serves, so the demo never depends
 * on the network. Re-run it before a demo to refresh prices.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { TICKERS } from "../src/data/tickers";
import type { MarketSnapshot, SymbolSeries } from "../src/lib/types";

const UA = "Mozilla/5.0 (Sprout hackathon snapshot)";

interface YahooChart {
  chart: {
    result?: Array<{
      meta: {
        regularMarketPrice: number;
        chartPreviousClose?: number;
        previousClose?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        regularMarketTime: number;
      };
      timestamp?: number[];
      indicators: { quote: Array<{ close: Array<number | null> }> };
    }>;
  };
}

async function fetchChart(symbol: string, range: string, interval: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${symbol} ${range}: HTTP ${res.status}`);
  const json = (await res.json()) as YahooChart;
  const r = json.chart.result?.[0];
  if (!r) throw new Error(`${symbol}: empty result`);
  const closes = r.indicators.quote[0]?.close ?? [];
  const points = (r.timestamp ?? [])
    .map((t, i) => ({ t: t * 1000, c: closes[i] }))
    .filter((p): p is { t: number; c: number } => typeof p.c === "number")
    .map((p) => ({ t: p.t, c: Math.round(p.c * 100) / 100 }));
  return { meta: r.meta, points };
}

async function main() {
  const symbols: Record<string, SymbolSeries> = {};
  let asOf = 0;
  for (const { symbol } of TICKERS) {
    const daily = await fetchChart(symbol, "1y", "1d");
    const intraday = await fetchChart(symbol, "1d", "5m");
    const prevClose =
      daily.points.length > 1 ? daily.points[daily.points.length - 2].c : daily.meta.chartPreviousClose ?? daily.meta.regularMarketPrice;
    symbols[symbol] = {
      price: Math.round(daily.meta.regularMarketPrice * 100) / 100,
      prevClose,
      high52: daily.meta.fiftyTwoWeekHigh ?? null,
      low52: daily.meta.fiftyTwoWeekLow ?? null,
      daily: daily.points,
      intraday: intraday.points,
    };
    asOf = Math.max(asOf, daily.meta.regularMarketTime * 1000);
    process.stdout.write(`${symbol} `);
  }
  const snapshot: MarketSnapshot = { asOf, source: "Yahoo Finance (delayed)", symbols };
  const out = join(process.cwd(), "src/data/market-snapshot.json");
  writeFileSync(out, JSON.stringify(snapshot));
  console.log(`\nWrote ${Object.keys(symbols).length} symbols to ${out} (as of ${new Date(asOf).toISOString()})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
