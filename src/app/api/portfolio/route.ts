import type { NextRequest } from "next/server";
import { withSession } from "@/lib/server/http";
import { getFullSeries, getPriceMap, getQuotes, marketAsOf } from "@/lib/server/market";
import { diversification, portfolioSeries, valuePortfolio } from "@/lib/portfolio";
import { challenges, graduateProgress, heldThroughDip } from "@/lib/progress";
import type { ChartRange } from "@/lib/types";

const RANGES: ChartRange[] = ["1D", "1W", "1M", "1Y"];

/** GET /api/portfolio?range=1M: valuation, chart, diversification, challenges, graduate progress. */
export async function GET(req: NextRequest) {
  return withSession(
    req,
    async ({ user }) => {
      const rangeParam = req.nextUrl.searchParams.get("range") as ChartRange;
      const range = RANGES.includes(rangeParam) ? rangeParam : "1M";
      const traded = [...new Set(user.portfolio.trades.map((t) => t.symbol))];
      const held = user.portfolio.holdings.map((h) => h.symbol);
      const [prices, quotes] = await Promise.all([getPriceMap([...traded, ...held]), getQuotes(held)]);
      const view = valuePortfolio(user.portfolio, prices);
      const histories = Object.fromEntries(traded.map((s) => [s, getFullSeries(s, range)]));
      const dailyHistories = Object.fromEntries(traded.map((s) => [s, getFullSeries(s, "1Y")]));
      const now = Math.max(Date.now(), marketAsOf());
      return {
        portfolio: {
          view,
          diversification: diversification(view),
          series: portfolioSeries(user.portfolio, histories, prices, range, now),
          range,
          challenges: challenges(user, heldThroughDip(user, dailyHistories)),
          graduate: graduateProgress(user),
          quotes,
          asOf: quotes[0]?.asOf ?? marketAsOf(),
        },
      };
    },
    { mutates: false },
  );
}
