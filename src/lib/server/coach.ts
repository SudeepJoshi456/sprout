import "server-only";
import { randomUUID } from "node:crypto";
import { LESSON_META } from "@/data/lessons";
import { TICKER_MAP } from "@/data/tickers";
import { periodRange, safeToSpend, summarizeCategories } from "@/lib/budget";
import { formatMoney } from "@/lib/format";
import { diversification, valuePortfolio, type PriceMap } from "@/lib/portfolio";
import type { CoachMessage, Trade, UserState } from "@/lib/types";
import { phraseCoach } from "./ai";

/**
 * Coach insights. Rules pick the topic and lesson (deterministic, testable);
 * AI (when live) only rewrites the wording. One insight per trade, and at
 * most one daily insight.
 */
const lessonTitle = (id: string) => LESSON_META.find((l) => l.id === id)?.title ?? "";

function message(kind: CoachMessage["kind"], title: string, body: string, lessonId: string, source: CoachMessage["source"]): CoachMessage {
  return { id: randomUUID(), kind, title, body, lessonId, createdAt: new Date().toISOString(), dismissed: false, source };
}

export async function coachAfterTrade(user: UserState, trade: Trade, prices: PriceMap): Promise<CoachMessage> {
  const view = valuePortfolio(user.portfolio, prices);
  const div = diversification(view);
  const info = TICKER_MAP[trade.symbol];
  const weekAgo = Date.now() - 7 * 86_400_000;
  const recentBuys = user.portfolio.trades.filter((t) => t.side === "buy" && Date.parse(t.at) >= weekAgo);
  const sameSector = new Set(recentBuys.filter((t) => TICKER_MAP[t.symbol]?.sector === info?.sector && TICKER_MAP[t.symbol]?.kind === "stock").map((t) => t.symbol));

  let draft: { title: string; body: string; lessonId: string; facts: string };
  if (trade.side === "sell") {
    const lost = trade.price < (user.portfolio.trades.find((t) => t.symbol === trade.symbol && t.side === "buy")?.price ?? trade.price);
    draft = lost
      ? {
          title: "Selling after a drop locks in the loss",
          body: `You sold ${trade.symbol} below what you paid. That's a normal part of learning. Here's how people think about price drops before deciding.`,
          lessonId: "market-dips",
          facts: `Sold ${trade.symbol} below the purchase price.`,
        }
      : {
          title: "A sale moves Seeds back to cash",
          body: `Your ${trade.symbol} Seeds are back in cash. Cash doesn't grow, but it doesn't swing either. Here's how time and compounding fit in.`,
          lessonId: "compound-growth",
          facts: `Sold ${trade.symbol} at or above the purchase price.`,
        };
  } else if (info?.sector && sameSector.size >= 2) {
    draft = {
      title: `You bought ${sameSector.size} ${info.sector.toLowerCase()} stocks this week`,
      body: `Companies in the same industry often move together. Here's what concentration risk means and how a broad fund changes it.`,
      lessonId: "diversification",
      facts: `Bought ${[...sameSector].join(", ")} this week, all ${info.sector}.`,
    };
  } else if (div.level === "concentrated" && !div.largestIsFund) {
    draft = {
      title: `${div.largestPct}% of your invested Seeds are in ${div.largestSymbol}`,
      body: `When one company is most of your portfolio, its bad days become your bad days. Here's what diversification does about that.`,
      lessonId: "diversification",
      facts: `Largest position ${div.largestSymbol} is ${div.largestPct}% of invested value.`,
    };
  } else if (info?.kind === "etf") {
    draft = {
      title: "One purchase, hundreds of companies",
      body: `${info.name} holds many companies at once, so no single one decides how you do. That's diversification. Here's how index funds work.`,
      lessonId: user.learning.completed["index-funds"] ? "diversification" : "index-funds",
      facts: `Bought ${formatMoney(trade.amountCents)} of ${info.name}, a broad fund.`,
    };
  } else {
    draft = {
      title: `You now own a slice of ${info?.name ?? trade.symbol}`,
      body: `A share is a small piece of a company. Its price moves with what people expect next. Here's what that ownership really means.`,
      lessonId: "what-is-a-stock",
      facts: `Bought ${formatMoney(trade.amountCents)} of ${info?.name ?? trade.symbol}.`,
    };
  }
  const phrased = await phraseCoach(user, { ...draft, lessonTitle: lessonTitle(draft.lessonId) });
  return message("trade", phrased.title, phrased.body, draft.lessonId, phrased.source);
}

/** Adds one rule-based daily insight if there isn't one from today yet. */
export function ensureDailyInsight(user: UserState, prices: PriceMap) {
  if (!user.settings.notifications.coach || !user.profile.onboarded) return;
  const today = new Date().toDateString();
  if (user.coach.some((c) => new Date(c.createdAt).toDateString() === today)) return;

  const sts = safeToSpend(user);
  const r = periodRange(user.budget);
  const tight = summarizeCategories(user, r).find((c) => !c.essential && c.status !== "on_track");
  const div = diversification(valuePortfolio(user.portfolio, prices));
  let m: CoachMessage | null = null;
  if (sts.uncoveredBills[0]) {
    const { bill, gapCents } = sts.uncoveredBills[0];
    m = message("budget", `${bill.name} is ${formatMoney(gapCents, { trimZeroCents: true })} short`, `Setting the rest aside now means you can't accidentally spend it. Budgeting by semester shows how.`, "semester-budget", "rule");
  } else if (tight) {
    m = message("budget", `${formatMoney(Math.max(0, tight.leftCents), { trimZeroCents: true })} left for ${tight.label.toLowerCase()}`, `That's about ${formatMoney(tight.perWeekCents, { trimZeroCents: true })} a week until ${r.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}. Small weekly check-ins make this easier.`, "semester-budget", "rule");
  } else if (div.level === "concentrated" && !div.largestIsFund) {
    m = message("daily", `${div.largestPct}% of your practice money is in one stock`, `Here's what concentration risk means, in 2 minutes.`, "diversification", "rule");
  }
  if (m) user.coach.unshift(m);
}
