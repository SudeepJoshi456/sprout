/**
 * Budgeting rules (pure functions, shared by client and server).
 *
 * Safe to spend (brief §7):
 *   balance − Σ(set-asides for unpaid bills) − Σ(remaining essentials budget this period)
 * Never negative. "This week" spreads that over the weeks left in the period.
 */
import type { Bill, Budget, BudgetCategory, BudgetPeriod, CategoryId, Transaction, UserState } from "./types";
import { CATEGORIES } from "@/data/categories";

export interface PeriodRange {
  period: BudgetPeriod;
  start: Date;
  end: Date; // inclusive, end of day
  label: string;
  daysLeft: number;
  weeksLeft: number;
  /** Monthly limits are multiplied by this to get the period limit. */
  monthsInPeriod: number;
}

export function periodRange(budget: Budget, period: BudgetPeriod = budget.period, now = new Date()): PeriodRange {
  let start: Date;
  let end: Date;
  let label: string;
  if (period === "semester") {
    start = new Date(budget.semester.start + "T00:00:00");
    end = new Date(budget.semester.end + "T23:59:59");
    label = budget.semester.name;
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    label = now.toLocaleDateString("en-US", { month: "long" });
  }
  const daysLeft = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
  const monthsInPeriod =
    period === "monthly" ? 1 : Math.max(1, Math.round(((end.getTime() - start.getTime()) / (86_400_000 * 30.44)) * 10) / 10);
  return { period, start, end, label, daysLeft, weeksLeft, monthsInPeriod };
}

export function inRange(iso: string, r: PeriodRange) {
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t <= r.end.getTime();
}

export function spentInCategory(transactions: Transaction[], category: CategoryId, r: PeriodRange) {
  let total = 0;
  for (const tx of transactions) {
    if (tx.category === category && tx.amountCents < 0 && inRange(tx.date, r)) total += -tx.amountCents;
  }
  return total;
}

export type CategoryStatus = "on_track" | "close" | "over";

export interface CategorySummary {
  id: CategoryId;
  label: string;
  essential: boolean;
  limitCents: number;
  spentCents: number;
  leftCents: number; // may be negative when over
  pct: number; // 0..1+ (spent / limit)
  status: CategoryStatus;
  perWeekCents: number; // remaining spread across weeks left
}

export function categoryLimit(cat: BudgetCategory, r: PeriodRange) {
  return Math.round(cat.monthlyLimitCents * r.monthsInPeriod);
}

export function summarizeCategories(state: Pick<UserState, "budget" | "transactions">, r: PeriodRange): CategorySummary[] {
  return state.budget.categories.map((cat) => {
    const limitCents = categoryLimit(cat, r);
    const spentCents = spentInCategory(state.transactions, cat.id, r);
    const leftCents = limitCents - spentCents;
    const pct = limitCents > 0 ? spentCents / limitCents : 0;
    const status: CategoryStatus = pct > 1 ? "over" : pct >= 0.85 ? "close" : "on_track";
    return {
      id: cat.id,
      label: CATEGORIES[cat.id].label,
      essential: cat.essential,
      limitCents,
      spentCents,
      leftCents,
      pct,
      status,
      perWeekCents: Math.max(0, Math.floor(leftCents / r.weeksLeft)),
    };
  });
}

export function unpaidBills(bills: Bill[]) {
  return bills.filter((b) => !b.paid).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export interface SafeToSpend {
  balanceCents: number;
  billsSetAsideCents: number;
  essentialsRemainingCents: number;
  periodCents: number;
  weekCents: number;
  weeksLeft: number;
  /** Bills that still have money not yet set aside. */
  uncoveredBills: Array<{ bill: Bill; gapCents: number }>;
}

export function safeToSpend(state: Pick<UserState, "account" | "bills" | "budget" | "transactions">, now = new Date()): SafeToSpend {
  const r = periodRange(state.budget, state.budget.period, now);
  const open = unpaidBills(state.bills);
  const billsSetAsideCents = open.reduce((s, b) => s + b.setAsideCents, 0);
  const essentialsRemainingCents = summarizeCategories(state, r)
    .filter((c) => c.essential)
    .reduce((s, c) => s + Math.max(0, c.leftCents), 0);
  const periodCents = Math.max(0, state.account.balanceCents - billsSetAsideCents - essentialsRemainingCents);
  const uncoveredBills = open
    .filter((b) => new Date(b.dueDate) <= r.end && b.setAsideCents < b.amountCents)
    .map((bill) => ({ bill, gapCents: bill.amountCents - bill.setAsideCents }));
  return {
    balanceCents: state.account.balanceCents,
    billsSetAsideCents,
    essentialsRemainingCents,
    periodCents,
    weekCents: Math.floor(periodCents / r.weeksLeft),
    weeksLeft: r.weeksLeft,
    uncoveredBills,
  };
}
