"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BookOpen, ChevronRight, Globe, Sprout, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { Change, Money } from "@/components/ui/money";
import { Ring } from "@/components/ui/progress";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { SimulatedBadge } from "@/components/ui/badge";
import { CoachCard, activeCoach } from "@/components/money/coach-card";
import { SafeToSpendCard } from "@/components/money/safe-to-spend";
import { BillRow } from "@/components/money/rows";
import { LessonCard } from "@/components/learn/lesson-card";
import { ButtonLink } from "@/components/ui/button";
import { FX_PER_USD } from "@/data/fx";
import { periodRange, summarizeCategories, unpaidBills } from "@/lib/budget";
import { useAppState, useResource } from "@/lib/client/hooks";
import { formatForeign, formatMoney, msFromNow } from "@/lib/format";
import type { LessonsResponse, PortfolioResponse } from "@/lib/api-types";
import type { UserState } from "@/lib/types";
import { t } from "@/i18n";

function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? "home.morning" : h < 18 ? "home.afternoon" : "home.evening";
}

/** ★ Home dashboard */
export default function HomePage() {
  const { user, persona } = useAppState();
  const coach = activeCoach(user.coach);
  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-3">
        <h1 className="min-w-0 truncate font-display text-headline font-semibold">{t(greetingKey(), { name: user.profile.preferredName })}</h1>
        <Link href="/profile" aria-label={t("home.profile")} className="rounded-full">
          <Avatar name={user.profile.fullName} />
        </Link>
      </header>
      <main id="main" tabIndex={-1} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-6 outline-none">
        <Suspense>
          <WelcomeMoment name={user.profile.preferredName} />
        </Suspense>
        <BalanceCard user={user} />
        <MoneyFromHome user={user} />
        <SafeToSpendCard user={user} />
        {coach && <CoachCard message={coach} />}
        <TodaysLesson persona={persona} />
        <BudgetSummary user={user} />
        <PortfolioSnapshot persona={persona} />
        <UpcomingBills user={user} />
      </main>
    </>
  );
}

function WelcomeMoment({ name }: { name: string }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("welcome") === "1");
  if (!open) return null;
  return (
    <div role="status" className="relative flex animate-rise items-center gap-3 overflow-hidden rounded-2xl bg-accent p-4 text-accent-foreground">
      <span className="flex size-12 shrink-0 origin-bottom animate-grow items-end justify-center">
        <Sprout className="size-10" aria-hidden />
      </span>
      <div className="min-w-0 pr-8">
        <p className="font-display text-title font-semibold">{t("onboarding.welcomeTitle", { name })}</p>
        <p className="text-body">{t("onboarding.welcomeSub")}</p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label={t("app.close")}
        className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full hover:bg-black/5"
      >
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

function BalanceCard({ user }: { user: UserState }) {
  const home = user.profile.homeCurrency;
  const showHome = home && user.settings.showHomeCurrency && FX_PER_USD[home];
  const actions = [
    { href: "/move", label: t("home.quickSend"), Icon: ArrowUpRight },
    { href: "/move?tab=request", label: t("home.quickRequest"), Icon: ArrowDownLeft },
    { href: "/grow", label: t("home.quickBuy"), Icon: Sprout },
    { href: "/learn", label: t("home.quickLearn"), Icon: BookOpen },
  ];
  return (
    <Card aria-labelledby="balance-title" className="p-5">
      <div className="flex items-center justify-between">
        <h2 id="balance-title" className="text-body text-muted-foreground">
          {t("home.balance")} ••{user.account.lastFour}
        </h2>
        <SimulatedBadge />
      </div>
      <p className="mt-1 font-display text-display font-semibold tracking-tight" aria-live="polite">
        <span className="sr-only">{t("home.balanceLabel")}: </span>
        <Money cents={user.account.balanceCents} />
      </p>
      {showHome && (
        <p className="tnum text-body text-muted-foreground">
          {t("home.approxHome", { amount: formatForeign(Math.round(user.account.balanceCents * FX_PER_USD[home]), home) })}{" "}
          <span className="text-caption">{t("home.approxHomeRate", { rate: FX_PER_USD[home] })}</span>
        </p>
      )}
      <nav aria-label={t("home.quickActions")} className="mt-4 grid grid-cols-4 gap-2">
        {actions.map(({ href, label, Icon }) => (
          <Link key={label} href={href} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-secondary text-caption font-semibold text-secondary-foreground hover:brightness-95">
            <Icon className="size-5 text-primary" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </Card>
  );
}

function MoneyFromHome({ user }: { user: UserState }) {
  const recent = user.transfers.find(
    (tr) => tr.direction === "in" && tr.rate && -msFromNow(tr.createdAt) < 14 * 86_400_000,
  );
  if (!recent) return null;
  return (
    <Link href="/move" className="flex items-center gap-3 rounded-2xl border border-info/20 bg-info-soft p-4 text-foreground">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-info">
        <Globe className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold">{t("home.moneyFromHome")}</span>
        <span className="tnum block text-body">
          {t("home.moneyFromHomeBody", {
            from: recent.counterpartyName.split(" (")[0],
            foreign: formatForeign(recent.counterpart.value, recent.counterpart.currency),
            usd: formatMoney(recent.debit.value),
          })}
        </span>
        <span className="tnum block text-caption text-muted-foreground">
          {t("home.rateFee", { rate: recent.rate ?? "", fee: formatMoney(recent.feeCents) })}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

function TodaysLesson({ persona }: { persona: string }) {
  const { data, loading } = useResource<LessonsResponse>(`/api/lessons?p=${persona}`);
  if (loading) return <SkeletonCard lines={2} />;
  const next = data?.lessons.find((l) => !l.completed);
  return (
    <section aria-labelledby="lesson-title">
      <h2 id="lesson-title" className="mb-2 px-1 text-body font-semibold">
        {t("home.lessonTitle")}
      </h2>
      {next ? <LessonCard lesson={next} featured /> : <Card><p className="text-body">{t("home.allLessonsDone")}</p></Card>}
    </section>
  );
}

function BudgetSummary({ user }: { user: UserState }) {
  const r = periodRange(user.budget);
  const top = summarizeCategories(user, r)
    .filter((c) => c.limitCents > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);
  return (
    <Card aria-labelledby="budget-sum">
      <CardHeader
        id="budget-sum"
        title={t("home.budgetTitle", { period: r.period === "semester" ? user.budget.semester.name : r.label })}
        action={
          <Link href="/budget" className="inline-flex min-h-11 items-center gap-1 text-body font-semibold text-primary">
            {t("home.budgetSee")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <ul className="space-y-3">
        {top.map((c) => {
          const tone = c.status === "over" ? "negative" : c.status === "close" ? "warning" : "positive";
          const status = c.status === "over" ? t("budget.overLabel") : c.status === "close" ? t("budget.closeLabel") : t("budget.onTrack");
          return (
            <li key={c.id} className="flex items-center gap-3">
              <span className="relative">
                <Ring value={c.pct} size={44} tone={tone} />
                <span className="tnum absolute inset-0 flex items-center justify-center text-[11px] font-semibold">{Math.round(c.pct * 100)}%</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium">{c.label}</p>
                <p className="tnum text-caption text-muted-foreground">
                  {t("budget.summarySpent", { spent: formatMoney(c.spentCents, { trimZeroCents: true }), limit: formatMoney(c.limitCents, { trimZeroCents: true }) })}
                </p>
              </div>
              <span className={`text-caption font-semibold ${tone === "positive" ? "text-positive" : tone === "warning" ? "text-warning" : "text-negative"}`}>{status}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function PortfolioSnapshot({ persona }: { persona: string }) {
  const { data, loading } = useResource<PortfolioResponse>(`/api/portfolio?range=1D&p=${persona}`);
  if (loading || !data) {
    return (
      <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-4" aria-hidden>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    );
  }
  const { view } = data.portfolio;
  if (view.holdings.length === 0) {
    return (
      <Card className="flex items-start gap-3 border-dashed">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-practice-soft text-practice">
          <Sprout className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold">{t("home.portfolioEmptyTitle")}</p>
          <p className="mt-0.5 text-body text-muted-foreground">{t("home.portfolioEmptyBody")}</p>
          <ButtonLink href="/grow?tab=explore" variant="secondary" className="mt-3">
            {t("home.portfolioEmptyCta")}
          </ButtonLink>
        </div>
      </Card>
    );
  }
  return (
    <Link href="/grow" className="block rounded-2xl border border-border/70 bg-card p-4 shadow-card hover:border-primary">
      <div className="flex items-center justify-between">
        <h2 className="text-body font-semibold">{t("home.portfolioTitle")}</h2>
        <SimulatedBadge />
      </div>
      <p className="mt-1 font-display text-headline font-semibold">
        <Money cents={view.totalCents} />
      </p>
      {view.dayChangeCents === 0 ? (
        <p className="text-body text-muted-foreground">{t("home.portfolioFlat")}</p>
      ) : (
        <Change cents={view.dayChangeCents} pct={view.dayChangePct} suffix={t("home.todayWord")} />
      )}
    </Link>
  );
}

function UpcomingBills({ user }: { user: UserState }) {
  const next = unpaidBills(user.bills).slice(0, 3);
  return (
    <Card aria-labelledby="bills-title">
      <CardHeader
        id="bills-title"
        title={t("home.billsTitle")}
        action={
          <Link href="/budget#bills" className="inline-flex min-h-11 items-center gap-1 text-body font-semibold text-primary">
            {t("app.seeAll")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      {next.length === 0 ? (
        <p className="text-body text-muted-foreground">{t("home.billsEmpty")}</p>
      ) : (
        <div className="-my-3 divide-y divide-border">
          {next.map((b) => (
            <BillRow key={b.id} bill={b} />
          ))}
        </div>
      )}
    </Card>
  );
}
