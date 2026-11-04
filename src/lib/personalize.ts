/**
 * Ranks lessons for the "For you" feed.
 * Inputs (brief §7): onboarding answers, ID type, spending patterns,
 * practice portfolio behavior, completed lessons.
 */
import { LESSON_META } from "@/data/lessons";
import type { LessonSummary, UserState } from "./types";
import { periodRange, summarizeCategories } from "./budget";
import { diversification, valuePortfolio, type PriceMap } from "./portfolio";

interface Signal {
  score: number;
  reason: string | null;
}

export function rankLessons(state: UserState, prices: PriceMap): LessonSummary[] {
  const p = state.profile;
  const signals: Record<string, Signal> = Object.fromEntries(LESSON_META.map((l) => [l.id, { score: 0, reason: null }]));
  const bump = (id: string, by: number, reason: string) => {
    const s = signals[id];
    if (!s) return;
    s.score += by;
    // Keep the reason from the strongest single signal.
    if (!s.reason || by >= 3) s.reason = reason;
  };

  if (p.reasons.includes("new_to_us")) {
    bump("credit-new", 4, "Because you're new to the US");
    bump("ssn-vs-itin", 3, "Because you're new to the US");
    bump("us-banking-basics", 2, "Because you're new to the US");
    bump("send-home", 2, "Because you're new to the US");
  }
  if (p.idType === "passport" || p.idType === "itin") {
    bump("ssn-vs-itin", 2, "Because you signed up without an SSN");
    bump("credit-new", 1, "Because you signed up without an SSN");
  }
  if (p.reasons.includes("new_to_money")) {
    bump("first-credit-card", 3, "Because you're new to managing money");
    bump("emergency-fund", 2, "Because you're new to managing money");
    bump("us-banking-basics", 1, "Because you're new to managing money");
  }
  if (p.reasons.includes("learn_investing")) {
    bump("index-funds", 3, "Because you want to learn investing");
    bump("what-is-a-stock", 2, "Because you want to learn investing");
    bump("compound-growth", 1, "Because you want to learn investing");
  }
  switch (p.goal) {
    case "send_home":
      bump("send-home", 4, "For your goal: send money home affordably");
      break;
    case "understand_credit":
      bump("credit-new", 3, "For your goal: understand credit");
      bump("first-credit-card", 3, "For your goal: understand credit");
      break;
    case "start_investing":
      bump("index-funds", 3, "For your goal: start investing");
      break;
    case "emergency_fund":
      bump("emergency-fund", 4, "For your goal: build an emergency fund");
      break;
  }
  if (p.reasons.includes("new_to_us")) {
    bump("money-scams", 2, "Scammers often target people new to the US");
    bump("remittance-rights", 1, "Because you're new to the US");
  }
  if (p.visaType === "F-1" || p.visaType === "J-1") bump("student-taxes", 3, `Because you're on a ${p.visaType} visa`);
  if (p.goal === "send_home") bump("remittance-rights", 3, "For your goal: send money home affordably");
  if (p.goal === "understand_credit") bump("credit-reports", 2, "For your goal: understand credit");
  if (state.portfolio.holdings.some((h) => ["VOO", "VTI", "VT", "VXUS", "SCHD", "BND"].includes(h.symbol))) {
    bump("investing-fees", 2, "Because you hold a fund");
  }
  if (state.transfers.some((t) => t.direction === "out")) bump("how-interledger-works", 1, "Because you've sent money with Sprout");
  if (state.budget.period === "semester") bump("semester-budget", 2, "Because you budget by semester");
  if (state.transfers.some((t) => t.direction === "in" && t.rate)) bump("send-home", 1, "Because you receive money from abroad");

  // Spending patterns: categories close to or over their limit.
  const r = periodRange(state.budget);
  const tight = summarizeCategories(state, r).filter((c) => !c.essential && c.status !== "on_track");
  if (tight.length > 0) {
    bump("semester-budget", 2, `You're close to your ${tight[0].label.toLowerCase()} limit`);
    bump("emergency-fund", 1, `You're close to your ${tight[0].label.toLowerCase()} limit`);
  }

  // Practice portfolio behavior.
  const view = valuePortfolio(state.portfolio, prices);
  const div = diversification(view);
  if (div.level === "concentrated") bump("diversification", 5, `${div.largestPct}% of your practice money is in one stock`);
  if (view.holdings.some((h) => h.gainPct <= -5)) bump("market-dips", 4, "One of your practice holdings is down");
  if (state.portfolio.trades.length > 0) bump("what-is-a-stock", 1, "Because you've started practicing");

  const order = LESSON_META.map((l, i) => ({ l, i }));
  return order
    .map(({ l, i }) => ({
      id: l.id,
      title: l.title,
      summary: l.summary,
      minutes: l.minutes,
      track: l.track,
      reason: signals[l.id].reason,
      completed: Boolean(state.learning.completed[l.id]),
      _score: signals[l.id].score - i * 0.01,
    }))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || b._score - a._score)
    .map(({ _score, ...rest }) => {
      void _score;
      return rest;
    });
}

/** Learning streak: consecutive days (ending today or yesterday) with a completed lesson. */
export function learningStreak(state: UserState, now = new Date()) {
  const days = new Set(
    Object.values(state.learning.completed).map((c) => new Date(c.completedAt).toDateString()),
  );
  let streak = 0;
  const d = new Date(now);
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
