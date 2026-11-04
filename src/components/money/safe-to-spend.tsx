"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Money } from "@/components/ui/money";
import { safeToSpend, periodRange } from "@/lib/budget";
import { formatDate, formatMoney } from "@/lib/format";
import type { UserState } from "@/lib/types";
import { t } from "@/i18n";

/** Big, friendly "safe to spend this week" number; the formula is one tap away. */
export function SafeToSpendCard({ user }: { user: UserState }) {
  const [open, setOpen] = useState(false);
  const s = safeToSpend(user);
  const r = periodRange(user.budget);
  return (
    <section aria-labelledby="sts-title" className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-card">
      <h2 id="sts-title" className="text-body font-medium opacity-90">
        {t("home.safeToSpend")}
      </h2>
      <p className="mt-1 font-display text-display font-semibold tracking-tight" aria-live="polite">
        <Money cents={s.weekCents} trimZeroCents />
      </p>
      <p className="mt-1 text-body opacity-90">{t("home.safeToSpendHint")}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-body font-semibold hover:bg-white/25"
      >
        <Info className="size-4" aria-hidden />
        {t("home.howCalculated")}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={t("safe.title")} description={t("safe.intro")}>
        <dl className="divide-y divide-border rounded-xl border border-border">
          <Row label={t("safe.balance")} value={formatMoney(s.balanceCents)} />
          <Row label={t("safe.bills")} value={`− ${formatMoney(s.billsSetAsideCents)}`} />
          <Row label={t("safe.essentials")} value={`− ${formatMoney(s.essentialsRemainingCents)}`} />
          <Row label={t("safe.period", { date: formatDate(r.end) })} value={formatMoney(s.periodCents)} strong />
          <Row label={t("safe.weeks", { n: s.weeksLeft })} value={`÷ ${s.weeksLeft}`} />
          <Row label={t("safe.perWeek")} value={formatMoney(s.weekCents)} strong />
        </dl>
        {s.uncoveredBills.map(({ bill, gapCents }) => (
          <p key={bill.id} className="mt-3 rounded-xl bg-warning-soft p-3 text-body text-warning">
            {t("safe.uncovered", { bill: bill.name, amount: formatMoney(gapCents, { trimZeroCents: true }) })}
          </p>
        ))}
        <p className="mt-3 text-caption text-muted-foreground">{t("safe.never")}</p>
      </Sheet>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</dt>
      <dd className={`tnum ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
