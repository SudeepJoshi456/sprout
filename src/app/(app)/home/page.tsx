"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { ArrowDownLeft, BookOpen, CalendarClock, ChartLine, ChevronRight, Plus, Sprout, Wallet, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { SimulatedBadge } from "@/components/ui/badge";
import { ConnectWallet, WalletReturnNotice } from "@/components/money/connect-wallet";
import { WalletActivityCard } from "@/components/money/wallet-activity";
import { ButtonLink } from "@/components/ui/button";
import { periodRange, summarizeCategories, unpaidBills } from "@/lib/budget";
import { useAppState, useResource } from "@/lib/client/hooks";
import { cn, formatMoney, formatPercent, msFromNow, relativeDays } from "@/lib/format";
import type { LessonsResponse, PortfolioResponse } from "@/lib/api-types";
import type { UserState } from "@/lib/types";
import { t } from "@/i18n";

function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? "home.morning" : h < 18 ? "home.afternoon" : "home.evening";
}

/** ★ Home: your money at a glance, one main action, and a short overview that links to each page. */
export default function HomePage() {
  const { user, userId, modes, wallet } = useAppState();
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
          <WalletReturnNotice />
        </Suspense>
        {modes.payments !== "interledger" ? (
          <OfflineCard />
        ) : wallet ? (
          <WalletActivityCard>
            <MoneyActions />
          </WalletActivityCard>
        ) : (
          <Card aria-labelledby="connect-title" className="p-5">
            <h2 id="connect-title" className="font-display text-title font-semibold">
              {t("wallet.connectTitle")}
            </h2>
            <p className="mb-4 mt-1 text-body text-muted-foreground">{t("wallet.connectBody")}</p>
            <ConnectWallet returnTo="/home" />
          </Card>
        )}
        <Overview user={user} userId={userId} />
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

function MoneyActions() {
  return (
    <>
      <ButtonLink href="/move" size="lg" className="mt-4">
        {t("home.sendMoney")}
      </ButtonLink>
      <nav aria-label={t("home.quickActions")} className="mt-2 grid grid-cols-2 gap-2">
        <Link href="/add-money" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-body font-semibold text-primary hover:bg-muted">
          <Plus className="size-4" aria-hidden />
          {t("bank.ctaDeposit")}
        </Link>
        <Link href="/move?tab=request" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-body font-semibold text-primary hover:bg-muted">
          <ArrowDownLeft className="size-4" aria-hidden />
          {t("home.quickRequest")}
        </Link>
      </nav>
    </>
  );
}

/** Shown when the server has no Interledger credentials: payments are simulated. */
function OfflineCard() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-title font-semibold">{t("wallet.activityTitle")}</h2>
        <SimulatedBadge />
      </div>
      <p className="mt-1 text-body text-muted-foreground">{t("wallet.notLive")}</p>
      <MoneyActions />
    </Card>
  );
}

/** One small tile per section: the single most useful number, and a link to the full page. */
function Overview({ user, userId }: { user: UserState; userId: string }) {
  const r = periodRange(user.budget);
  const cats = summarizeCategories(user, r);
  const left = Math.max(0, cats.reduce((s, c) => s + c.limitCents - c.spentCents, 0));
  const over = cats.filter((c) => c.status === "over").length;
  const bill = unpaidBills(user.bills)[0];
  const billSoon = bill && msFromNow(bill.dueDate) < 3 * 86_400_000;
  const lessons = useResource<LessonsResponse>(`/api/lessons?u=${userId}`);
  const portfolio = useResource<PortfolioResponse>(`/api/portfolio?range=1D&u=${userId}`);
  const next = lessons.data?.lessons.find((l) => !l.completed);
  const view = portfolio.data?.portfolio.view;

  return (
    <section aria-labelledby="overview-title">
      <h2 id="overview-title" className="mb-2 px-1 text-body font-semibold">
        {t("home.overview")}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <Tile href="/budget" icon={<Wallet className="size-4" aria-hidden />} label={t("tabs.budget")}>
          <p className="tnum font-display text-title font-semibold">{formatMoney(left, { trimZeroCents: true })}</p>
          <p className={cn("text-caption", over ? "font-semibold text-negative" : "text-muted-foreground")}>
            {over ? t("home.overCount", { n: over }) : t("home.leftThis", { period: r.period === "semester" ? t("budget.periodSemester").toLowerCase() : t("home.monthWord") })}
          </p>
        </Tile>
        <Tile href="/budget?tab=bills" icon={<CalendarClock className="size-4" aria-hidden />} label={t("home.billsTitle")}>
          {bill ? (
            <>
              <p className="truncate font-display text-title font-semibold">{bill.name}</p>
              <p className={cn("text-caption", billSoon ? "font-semibold text-warning" : "text-muted-foreground")}>
                {formatMoney(bill.amountCents, { trimZeroCents: true })} · {relativeDays(bill.dueDate)}
              </p>
            </>
          ) : (
            <p className="text-body text-muted-foreground">{t("home.billsNoneShort")}</p>
          )}
        </Tile>
        <Tile href="/grow" icon={<ChartLine className="size-4" aria-hidden />} label={t("tabs.grow")}>
          {view ? (
            <>
              <p className="tnum font-display text-title font-semibold">
                <Money cents={view.totalCents} trimZeroCents />
              </p>
              <p className="text-caption text-muted-foreground">
                {view.holdings.length === 0
                  ? t("home.practiceStart")
                  : t("home.practiceToday", { pct: formatPercent(view.dayChangePct, { signed: true }) })}
              </p>
            </>
          ) : (
            <TileSkeleton />
          )}
        </Tile>
        <Tile href={next ? `/learn/${next.id}` : "/learn"} icon={<BookOpen className="size-4" aria-hidden />} label={t("home.continueLearning")}>
          {lessons.loading && !lessons.data ? (
            <TileSkeleton />
          ) : (
            <>
              <p className="line-clamp-2 text-body font-semibold leading-snug">{next ? next.title : t("home.allLessonsDone")}</p>
              {next && <p className="text-caption text-muted-foreground">{t("learn.minutes", { n: next.minutes })}</p>}
            </>
          )}
        </Tile>
      </div>
    </section>
  );
}

function Tile({ href, icon, label, children }: { href: string; icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-28 min-w-0 flex-col gap-1 rounded-2xl border border-border/70 bg-card p-3.5 shadow-card hover:border-primary">
      <span className="flex items-center gap-1.5 text-caption font-semibold text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="truncate">{label}</span>
        <ChevronRight className="ml-auto size-4 shrink-0" aria-hidden />
      </span>
      <div className="mt-auto min-w-0">{children}</div>
    </Link>
  );
}

function TileSkeleton() {
  return (
    <span className="block space-y-1.5" aria-hidden>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </span>
  );
}
