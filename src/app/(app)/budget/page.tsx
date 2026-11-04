"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { Screen } from "@/components/shell/screen";
import { Segmented } from "@/components/ui/segmented";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { CategoryIcon } from "@/components/ui/icon";
import { AmountDisplay, amountToCents, Keypad } from "@/components/ui/keypad";
import { BillRow } from "@/components/money/rows";
import { api, ApiClientError } from "@/lib/client/api";
import { useAppState } from "@/lib/client/hooks";
import { periodRange, summarizeCategories, unpaidBills, type CategorySummary } from "@/lib/budget";
import { CATEGORIES, EDITABLE_CATEGORIES } from "@/data/categories";
import { CURRENCY_NAMES, usdToForeign } from "@/data/fx";
import { cn, formatDayHeader, formatForeign, formatMoney, startOfDay } from "@/lib/format";
import type { Bill, BudgetPeriod, CategoryId, Transaction } from "@/lib/types";
import { t } from "@/i18n";

/** Budget: monthly or semester view, category limits, bill set-asides, and transactions. */
export default function BudgetPage() {
  const { user } = useAppState();
  const home = user.profile.homeCurrency;
  const [showHome, setShowHome] = useState(false);
  const [editing, setEditing] = useState<CategorySummary | null>(null);
  const [billEditing, setBillEditing] = useState<Bill | null>(null);
  const [recat, setRecat] = useState<Transaction | null>(null);

  const [pendingPeriod, setPendingPeriod] = useState<BudgetPeriod | null>(null);
  const period = pendingPeriod ?? user.budget.period;
  const r = periodRange(user.budget, period);
  const cats = summarizeCategories(user, r);
  const totalLimit = cats.reduce((s, c) => s + c.limitCents, 0);
  const totalSpent = cats.reduce((s, c) => s + c.spentCents, 0);
  const bills = unpaidBills(user.bills);

  const money = (cents: number) =>
    showHome && home ? formatForeign(usdToForeign(cents, home), home) : formatMoney(cents, { trimZeroCents: true });

  const setPeriod = async (next: BudgetPeriod) => {
    setPendingPeriod(next);
    try {
      await api("/api/budget", { method: "PATCH", body: { period: next } });
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setPendingPeriod((p) => (p === next ? null : p));
    }
  };

  return (
    <Screen
      title={t("budget.title")}
      banner={
        <div className="space-y-2 px-4 pb-3">
          <Segmented<BudgetPeriod>
            label={t("budget.periodLabel")}
            role="radiogroup"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "monthly", label: t("budget.periodMonthly") },
              { value: "semester", label: t("budget.periodSemester") },
            ]}
          />
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <Card aria-labelledby="bud-sum" className="p-5">
          <div className="flex items-center justify-between">
            <h2 id="bud-sum" className="text-body text-muted-foreground">
              {r.period === "semester" ? user.budget.semester.name : r.label}
            </h2>
            <span className="text-caption font-semibold text-muted-foreground">{t("budget.daysLeft", { n: r.daysLeft })}</span>
          </div>
          <p className="mt-1 font-display text-headline font-semibold tnum">{money(Math.max(0, totalLimit - totalSpent))}</p>
          <p className="text-caption text-muted-foreground">{t("budget.leftOverall")}</p>
          <ProgressBar
            className="mt-3"
            value={totalLimit ? totalSpent / totalLimit : 0}
            label={t("budget.title")}
            valueText={t("budget.summarySpent", { spent: money(totalSpent), limit: money(totalLimit) })}
            tone={totalSpent > totalLimit ? "negative" : totalSpent > totalLimit * 0.85 ? "warning" : "positive"}
          />
          <p className="mt-1.5 text-caption text-muted-foreground tnum">{t("budget.summarySpent", { spent: money(totalSpent), limit: money(totalLimit) })}</p>
          {home && (
            <div className="mt-3 border-t border-border pt-2">
              <Switch
                checked={showHome}
                onChange={setShowHome}
                label={t("budget.showHome", { currency: home })}
                hint={showHome ? t("budget.homeHint", { name: CURRENCY_NAMES[home] ?? home }) : undefined}
              />
            </div>
          )}
        </Card>

        <section aria-labelledby="bud-cats">
          <SectionTitle id="bud-cats">{t("budget.categories")}</SectionTitle>
          <ul className="divide-y divide-border rounded-2xl border border-border/70 bg-card px-4 shadow-card">
            {cats.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  aria-label={`${c.label}. ${statusText(c, money)}. ${t("budget.editLimit", { category: c.label })}`}
                  className="flex w-full items-start gap-3 py-3 text-left"
                >
                  <CategoryIcon category={c.id} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-body font-semibold">{c.label}</span>
                      {c.essential && <Badge>{t("budget.essential")}</Badge>}
                      <span className="tnum ml-auto text-caption text-muted-foreground">
                        {money(c.spentCents)} / {money(c.limitCents)}
                      </span>
                    </span>
                    <ProgressBar
                      className="mt-2"
                      value={c.pct}
                      label={c.label}
                      tone={c.status === "over" ? "negative" : c.status === "close" ? "warning" : "positive"}
                    />
                    <span className={cn("mt-1 block text-caption", c.status === "over" ? "font-semibold text-negative" : c.status === "close" ? "font-semibold text-warning" : "text-muted-foreground")}>
                      {statusText(c, money)}
                    </span>
                  </span>
                  <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <Card id="bills" aria-labelledby="bud-bills">
          <CardHeader id="bud-bills" title={t("budget.bills")} />
          <p className="-mt-2 text-caption text-muted-foreground">{t("budget.billsSub")}</p>
          {bills.length === 0 ? (
            <p className="py-3 text-body text-muted-foreground">{t("budget.billsNone")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {bills.map((b) => (
                <li key={b.id}>
                  <BillRow
                    bill={b}
                    action={
                      <Button variant="ghost" size="icon" onClick={() => setBillEditing(b)} aria-label={t("budget.setAsideFor", { bill: b.name })}>
                        <ChevronRight className="size-4" aria-hidden />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Transactions transactions={user.transactions} money={money} onPick={setRecat} />
      </div>

      {editing && <LimitSheet key={editing.id} cat={editing} months={r.monthsInPeriod} onClose={() => setEditing(null)} />}
      {billEditing && <SetAsideSheet key={billEditing.id} bill={billEditing} onClose={() => setBillEditing(null)} />}
      <RecategorizeSheet tx={recat} onClose={() => setRecat(null)} />
    </Screen>
  );
}

function statusText(c: CategorySummary, money: (n: number) => string) {
  if (c.status === "over") return t("budget.over", { amount: money(-c.leftCents), category: c.label });
  if (c.status === "close") return t("budget.close", { amount: money(c.leftCents), category: c.label });
  return t("budget.leftPeriod", { amount: money(c.leftCents), perWeek: money(c.perWeekCents) });
}

function Transactions({
  transactions,
  money,
  onPick,
}: {
  transactions: Transaction[];
  money: (n: number) => string;
  onPick: (tx: Transaction) => void;
}) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = [...transactions]
      .filter((tx) => !needle || tx.description.toLowerCase().includes(needle) || CATEGORIES[tx.category].label.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
    const out: Array<{ key: number; label: string; items: Transaction[] }> = [];
    for (const tx of list) {
      const key = startOfDay(new Date(tx.date)).getTime();
      const last = out[out.length - 1];
      if (last?.key === key) last.items.push(tx);
      else out.push({ key, label: formatDayHeader(tx.date), items: [tx] });
    }
    return out;
  }, [transactions, q]);

  return (
    <section aria-labelledby="bud-tx">
      <SectionTitle id="bud-tx">{t("budget.transactions")}</SectionTitle>
      <Field
        label={t("budget.search")}
        labelHidden
        type="search"
        placeholder={t("budget.search")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        trailing={<Search className="size-4 text-muted-foreground" aria-hidden />}
      />
      {groups.length === 0 ? (
        <p role="status" className="py-6 text-center text-body text-muted-foreground">
          {t("budget.searchEmpty", { q: q.trim() })}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {groups.map((g) => (
            <div key={g.key}>
              <h3 className="px-1 pb-1 text-caption font-semibold text-muted-foreground">{g.label}</h3>
              <ul className="divide-y divide-border rounded-2xl border border-border/70 bg-card px-4">
                {g.items.map((tx) => {
                  const incoming = tx.amountCents > 0;
                  const body = (
                    <>
                      <CategoryIcon category={tx.category} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium">{tx.description}</span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {incoming ? t("budget.moneyIn") : CATEGORIES[tx.category].label}
                        </span>
                      </span>
                      <span className={cn("tnum text-body font-semibold", incoming && "text-positive")}>
                        {incoming ? "+" : "−"}
                        {money(Math.abs(tx.amountCents))}
                      </span>
                    </>
                  );
                  return (
                    <li key={tx.id}>
                      {incoming ? (
                        <div className="flex min-h-14 items-center gap-3 py-2">{body}</div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onPick(tx)}
                          aria-label={`${tx.description}, ${money(-tx.amountCents)}, ${CATEGORIES[tx.category].label}. ${t("budget.changeCategory")}`}
                          className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
                        >
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LimitSheet({ cat, months, onClose }: { cat: CategorySummary; months: number; onClose: () => void }) {
  const monthly = Math.round(cat.limitCents / months);
  const [value, setValue] = useState(String(monthly / 100));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api("/api/budget", { method: "PATCH", body: { category: { id: cat.id, monthlyLimitCents: amountToCents(value) } } });
      toast.success(t("budget.limitSaved", { category: cat.label }));
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={t("budget.editLimit", { category: cat.label })}>
      <AmountDisplay value={value} label={t("budget.limitLabel")} sub={months > 1 ? t("budget.limitHint") : undefined} />
      <Keypad value={value} onChange={setValue} maxCents={10_000_000} label={t("budget.limitLabel")} />
      <Button size="lg" className="mt-3" onClick={save} loading={busy}>
        {t("app.save")}
      </Button>
    </Sheet>
  );
}

function SetAsideSheet({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const [value, setValue] = useState(String(bill.setAsideCents / 100));
  const [busy, setBusy] = useState(false);
  const save = async (cents: number) => {
    setBusy(true);
    try {
      await api(`/api/bills/${bill.id}`, { method: "PATCH", body: { setAsideCents: Math.min(cents, bill.amountCents) } });
      toast.success(t("budget.setAsideSaved", { bill: bill.name }));
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={t("budget.setAsideFor", { bill: bill.name })}>
      <AmountDisplay value={value} label={t("budget.setAside")} sub={t("budget.setAsideHint", { amount: formatMoney(bill.amountCents) })} />
      <div className="mb-3 flex justify-center">
        <Button variant="outline" onClick={() => setValue(String(bill.amountCents / 100))}>
          {t("budget.setAsideFull")}
        </Button>
      </div>
      <Keypad value={value} onChange={setValue} maxCents={bill.amountCents} label={t("budget.setAside")} />
      <Button size="lg" className="mt-3" onClick={() => save(amountToCents(value))} loading={busy}>
        {t("app.save")}
      </Button>
    </Sheet>
  );
}

function RecategorizeSheet({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  const [busy, setBusy] = useState<CategoryId | null>(null);
  const pick = async (category: CategoryId) => {
    if (!tx) return;
    if (category === tx.category) return onClose();
    setBusy(category);
    try {
      await api(`/api/transactions/${tx.id}`, { method: "PATCH", body: { category } });
      toast.success(t("budget.categoryUpdated", { category: CATEGORIES[category].label }));
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Sheet open={!!tx} onOpenChange={(o) => !o && onClose()} title={tx ? t("budget.categoryFor", { merchant: tx.description }) : t("budget.changeCategory")}>
      <ul role="radiogroup" aria-label={t("budget.changeCategory")} className="grid grid-cols-2 gap-2">
        {EDITABLE_CATEGORIES.map((id) => {
          const selected = tx?.category === id;
          return (
            <li key={id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={busy !== null}
                onClick={() => pick(id)}
                className={cn(
                  "flex min-h-14 w-full items-center gap-2 rounded-xl border px-3 text-left text-body font-medium transition-colors",
                  selected ? "border-primary bg-secondary" : "border-border hover:bg-muted",
                )}
              >
                <CategoryIcon category={id} className="size-8" />
                <span className="min-w-0 flex-1 truncate">{CATEGORIES[id].label}</span>
                {selected && <Check className="size-4 text-primary" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
