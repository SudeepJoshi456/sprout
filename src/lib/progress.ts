/**
 * Habit challenges and the "Graduate to real investing" card.
 * Rewards learning and patience only: never trading volume.
 */
import { INVESTING_LESSON_IDS } from "@/data/lessons";
import type { PricePoint, UserState } from "./types";
import { practiceDays } from "./portfolio";

export const GRADUATE_LESSONS = 5;
export const GRADUATE_DAYS = 14;

export interface Challenge {
  id: "five-holdings" | "hold-dip" | "three-lessons";
  title: string;
  detail: string;
  progress: number; // 0..1
  progressLabel: string;
  done: boolean;
}

/**
 * "Hold through a 5% dip for a week": some position, held 7+ days, saw its
 * price fall 5%+ below its purchase price at some point, and is still held.
 */
export function heldThroughDip(state: UserState, histories: Record<string, PricePoint[]>, now = Date.now()) {
  return state.portfolio.holdings.some((h) => {
    const buys = state.portfolio.trades.filter((t) => t.symbol === h.symbol && t.side === "buy");
    if (buys.length === 0) return false;
    const first = buys.reduce((a, b) => (a.at < b.at ? a : b));
    const since = Date.parse(first.at);
    if (now - since < 7 * 86_400_000) return false;
    const low = Math.min(...(histories[h.symbol] ?? []).filter((p) => p.t >= since).map((p) => p.c));
    return Number.isFinite(low) && low <= first.price * 0.95;
  });
}

export function challenges(state: UserState, dipDone: boolean): Challenge[] {
  const holdings = state.portfolio.holdings.length;
  const investingDone = INVESTING_LESSON_IDS.filter((id) => state.learning.completed[id]).length;
  return [
    {
      id: "five-holdings",
      title: "Build a portfolio with 5+ holdings",
      detail: "Spreading out is the simplest way to lower risk.",
      progress: Math.min(1, holdings / 5),
      progressLabel: `${Math.min(holdings, 5)} of 5 holdings`,
      done: holdings >= 5,
    },
    {
      id: "hold-dip",
      title: "Hold through a 5% dip for a week",
      detail: "Practice staying calm when prices fall.",
      progress: dipDone ? 1 : 0,
      progressLabel: dipDone ? "Done" : "Waiting for a dip",
      done: dipDone,
    },
    {
      id: "three-lessons",
      title: "Finish 3 investing lessons",
      detail: "Learn first, then practice.",
      progress: Math.min(1, investingDone / 3),
      progressLabel: `${Math.min(investingDone, 3)} of 3 lessons`,
      done: investingDone >= 3,
    },
  ];
}

export function graduateProgress(state: UserState, now = new Date()) {
  const lessons = Object.keys(state.learning.completed).length;
  const days = practiceDays(state.portfolio, now);
  const lessonPart = Math.min(lessons, GRADUATE_LESSONS) / GRADUATE_LESSONS;
  const dayPart = Math.min(days, GRADUATE_DAYS) / GRADUATE_DAYS;
  return {
    lessons,
    days,
    progress: (lessonPart + dayPart) / 2,
    ready: lessons >= GRADUATE_LESSONS && days >= GRADUATE_DAYS,
  };
}
