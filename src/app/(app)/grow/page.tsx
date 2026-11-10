"use client";

import Link from "next/link";
import { Suspense, useDeferredValue, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, GraduationCap, Lock, Search, ShieldCheck, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/shell/screen";
import { Segmented } from "@/components/ui/segmented";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Money, Change } from "@/components/ui/money";
import { LineChart } from "@/components/ui/chart";
import { ProgressBar } from "@/components/ui/progress";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { Field } from "@/components/ui/field";
import { Term } from "@/components/ui/term";
import { SimulatedBadge } from "@/components/ui/badge";
import { CoachCard } from "@/components/money/coach-card";
import { PracticeBanner, QuoteRow } from "@/components/grow/practice";
import { useAppState, useResource } from "@/lib/client/hooks";
import { CURATED_LISTS } from "@/data/tickers";
import { GRADUATE_DAYS, GRADUATE_LESSONS } from "@/lib/progress";
import { formatDate, formatDateTime, formatMoney, formatPercent, formatShares, formatTime } from "@/lib/format";
import type { PortfolioResponse, QuotesResponse } from "@/lib/api-types";
import type { ChartRange } from "@/lib/types";
import { t } from "@/i18n";

type Tab = "portfolio" | "explore";
const RANGES: ChartRange[] = ["1D", "1W", "1M", "1Y"];

/** Grow: practice investing with practice money (fake money for learning). */
export default function GrowPage() {
  return (
    <Suspense>
      <Grow />
    </Suspense>
  );
}

function Grow() {
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "explore" ? "explore" : "portfolio");
  const change = (next: Tab) => {
    setTab(next);
    router.replace(next === "explore" ? "/grow?tab=explore" : "/grow", { scroll: false });
  };
  return (
    <Screen
      title={t("grow.title")}
      banner={
        <>
          <PracticeBanner />
          <div className="px-4 pb-3 pt-3">
            <Segmented<Tab>
              label={t("grow.sectionTabs")}
              value={tab}
              onChange={change}
              controls="grow"
              options={[
                { value: "portfolio", label: t("grow.portfolio") },
                { value: "explore", label: t("grow.explore") },
              ]}
            />
          </div>
        </>
      }
    >
      <div role="tabpanel" id={`grow-panel-${tab}`} aria-labelledby={`grow-tab-${tab}`} className="pt-1">
        {tab === "portfolio" ? <PortfolioTab onExplore={() => change("explore")} /> : <ExploreTab />}
      </div>
    </Screen>
  );
}

function PortfolioTab({ onExplore }: { onExplore: () => void }) {
  const { user, userId } = useAppState();
  const [range, setRange] = useState<ChartRange>("1M");
  const { data, loading } = useResource<PortfolioResponse>(`/api/portfolio?range=${range}&u=${userId}`);
  const coach = user.coach.find((c) => c.kind === "trade" && !c.dismissed);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </div>
    );
  }
  if (!data) return null;
  const { view, diversification: div, series, challenges, graduate } = data.portfolio;
  const empty = view.holdings.length === 0;
  const recent = [...user.portfolio.trades].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);

  return (
    <div className="space-y-4">
      <section aria-labelledby="pm-explain" className="rounded-2xl border border-practice/25 bg-practice-soft p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-practice">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="pm-explain" className="font-sans text-body font-semibold text-foreground">
              {t("grow.explainTitle")}
            </h2>
            <p className="mt-0.5 text-body text-foreground/85">{t("grow.explainBody")}</p>
          </div>
        </div>
        {empty && (
          <Button size="lg" className="mt-3" onClick={onExplore}>
            {t("grow.explainCta")}
          </Button>
        )}
      </section>

      <Card aria-labelledby="pf-total" className="p-5">
        <div className="flex items-center justify-between">
          <h2 id="pf-total" className="text-body text-muted-foreground">
            {t("grow.totalValue")}
          </h2>
          <SimulatedBadge />
        </div>
        <p className="mt-1 font-display text-display font-semibold">
          <Money cents={view.totalCents} />
        </p>
        <p className="text-caption text-muted-foreground">
          <Term id="sprout-seeds">{t("grow.seeds")}</Term> · {t("grow.seedsNote")}
        </p>
        <div className="mt-2 flex flex-col gap-0.5">
          {view.dayChangeCents !== 0 && <Change cents={view.dayChangeCents} pct={view.dayChangePct} suffix={t("home.todayWord")} size="caption" />}
          <Change cents={view.totalGainCents} pct={view.totalGainPct} suffix={t("grow.sinceStart")} size="caption" />
        </div>

        <div className="mt-4">
          <LineChart
            points={series}
            label={t("grow.chartLabel", { range: rangeName(range) })}
            formatValue={(v) => formatMoney(Math.round(v * 100))}
            formatTime={(ts) => (range === "1D" ? formatTime(ts) : range === "1W" ? formatDateTime(ts) : formatDate(ts))}
            height={150}
          />
          <Segmented<ChartRange>
            label={t("grow.chartRange")}
            role="radiogroup"
            value={range}
            onChange={setRange}
            className="mt-3"
            options={RANGES.map((r) => ({ value: r, label: r }))}
          />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div>
            <dt className="text-caption text-muted-foreground">{t("grow.cashLeft")}</dt>
            <dd className="tnum text-body font-semibold">{formatMoney(view.cashCents)}</dd>
          </div>
          <div>
            <dt className="text-caption text-muted-foreground">{t("grow.invested")}</dt>
            <dd className="tnum text-body font-semibold">{formatMoney(view.investedCents)}</dd>
          </div>
        </dl>
      </Card>

      {coach && <CoachCard message={coach} />}

      <Card aria-labelledby="pf-holdings">
        <CardHeader id="pf-holdings" title={t("grow.holdings")} />
        {empty ? (
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-practice-soft text-practice">
              <Sprout className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-body text-muted-foreground">{t("grow.holdingsEmpty")}</p>
            </div>
          </div>
        ) : (
          <ul className="-my-1 divide-y divide-border">
            {view.holdings.map((h) => (
              <li key={h.symbol}>
                <Link href={`/grow/${h.symbol}`} className="flex min-h-16 items-center gap-3 py-2">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-caption font-bold text-secondary-foreground">
                    {h.symbol.slice(0, 4)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold">{h.name}</span>
                    <span className="block text-caption text-muted-foreground">
                      {t("grow.shares", { shares: formatShares(h.shares) })} · {formatPercent(h.weight * 100, { digits: 0 })}
                    </span>
                  </span>
                  <span className="text-right">
                    <Money cents={h.valueCents} className="block text-body font-semibold" />
                    <Change cents={h.gainCents} pct={h.gainPct} size="caption" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card aria-labelledby="pf-div">
        <CardHeader id="pf-div" title={<Term id="diversification">{t("grow.diversification")}</Term>} />
        <p className="text-body font-semibold">{divLabel(div)}</p>
        <ProgressBar
          className="mt-2"
          value={div.score / 100}
          label={t("grow.diversification")}
          valueText={divLabel(div)}
          tone={div.level === "well" ? "positive" : div.level === "some" ? "warning" : div.level === "concentrated" ? "negative" : "info"}
        />
        {div.count > 0 && div.largestSymbol && (
          <p className="mt-2 text-caption text-muted-foreground">{t("grow.divCount", { count: div.count, symbol: div.largestSymbol, pct: div.largestPct })}</p>
        )}
      </Card>

      <Card aria-labelledby="pf-ch">
        <CardHeader id="pf-ch" title={t("grow.challenges")} />
        <p className="-mt-2 mb-3 text-caption text-muted-foreground">{t("grow.challengesSub")}</p>
        <ul className="space-y-4">
          {challenges.map((c) => (
            <li key={c.id}>
              <div className="flex items-start gap-2">
                {c.done && <CircleCheck className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />}
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold">
                    {c.title}
                    {c.done && <span className="sr-only"> (done)</span>}
                  </p>
                  <p className="text-caption text-muted-foreground">{c.detail}</p>
                </div>
              </div>
              <ProgressBar className="mt-2" value={c.progress} label={c.title} valueText={c.progressLabel} tone={c.done ? "positive" : "practice"} />
              <p className="mt-1 text-caption text-muted-foreground">{c.progressLabel}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Link href="/grow/graduate" className="block rounded-2xl border border-border/70 bg-card p-4 shadow-card hover:border-primary">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <GraduationCap className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-body font-semibold">
              {t("grow.graduateTitle")} <Lock className="size-3.5 text-muted-foreground" aria-label="locked" />
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">{t("grow.graduateBody", { lessons: GRADUATE_LESSONS, days: GRADUATE_DAYS })}</p>
            <ProgressBar className="mt-2" value={graduate.progress} label={t("grow.graduateTitle")} valueText={`${Math.round(graduate.progress * 100)}%`} tone="practice" />
            <p className="mt-1 text-caption text-muted-foreground">
              {t("grow.graduateLessons", { n: Math.min(graduate.lessons, GRADUATE_LESSONS), total: GRADUATE_LESSONS })} ·{" "}
              {t("grow.graduateDays", { n: Math.min(graduate.days, GRADUATE_DAYS), total: GRADUATE_DAYS })}
            </p>
          </div>
        </div>
      </Link>

      {recent.length > 0 && (
        <section aria-labelledby="pf-recent">
          <SectionTitle id="pf-recent">{t("grow.recentTrades")}</SectionTitle>
          <ul className="divide-y divide-border rounded-2xl border border-border/70 bg-card px-4">
            {recent.map((tr) => (
              <li key={tr.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-body font-semibold">
                    {tr.side === "buy" ? t("grow.buy") : t("grow.sell")} {tr.symbol}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {t("grow.shares", { shares: formatShares(tr.shares) })} · {formatDate(tr.at)}
                  </p>
                </div>
                <Money cents={tr.amountCents} className="text-body font-semibold" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-caption text-muted-foreground">
        {t("grow.noAdvice")} {t("grow.delayed", { time: formatDateTime(data.portfolio.asOf) })}
      </p>
    </div>
  );
}

function ExploreTab() {
  const [q, setQ] = useState("");
  const deferred = useDeferredValue(q.trim());
  return (
    <div className="space-y-5">
      <Field
        label={t("grow.searchLabel")}
        labelHidden
        type="search"
        inputMode="search"
        placeholder={t("grow.searchPlaceholder")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        trailing={<Search className="size-4 text-muted-foreground" aria-hidden />}
      />
      {deferred ? (
        <SearchResults q={deferred} />
      ) : (
        CURATED_LISTS.map((list) => <CuratedList key={list.id} title={t(list.titleKey)} symbols={list.symbols} />)
      )}
      <p className="text-center text-caption text-muted-foreground">{t("grow.noAdvice")}</p>
    </div>
  );
}

function SearchResults({ q }: { q: string }) {
  const { data, loading } = useResource<QuotesResponse>(`/api/market/search?q=${encodeURIComponent(q)}`);
  if (loading && !data) return <QuoteSkeleton />;
  const quotes = data?.quotes ?? [];
  return (
    <section aria-live="polite">
      {quotes.length === 0 ? (
        <p className="py-6 text-center text-body text-muted-foreground">{t("grow.searchEmpty", { q })}</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border/70 bg-card px-4">
          {quotes.map((quote) => (
            <li key={quote.symbol}>
              <QuoteRow quote={quote} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CuratedList({ title, symbols }: { title: string; symbols: readonly string[] }) {
  const { data, loading } = useResource<QuotesResponse>(`/api/market/quotes?symbols=${symbols.join(",")}`);
  const id = `list-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={id}>
      <SectionTitle id={id}>{title}</SectionTitle>
      {loading && !data ? (
        <QuoteSkeleton />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border/70 bg-card px-4">
          {(data?.quotes ?? []).map((quote) => (
            <li key={quote.symbol}>
              <QuoteRow quote={quote} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function QuoteSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function divLabel(div: PortfolioResponse["portfolio"]["diversification"]) {
  switch (div.level) {
    case "none":
      return t("grow.divNone");
    case "concentrated":
      return t("grow.divConcentrated", { pct: div.largestPct });
    case "some":
      return t("grow.divSome", { count: div.count, pct: div.largestPct });
    case "well":
      return div.largestIsFund ? t("grow.divWellFund") : t("grow.divWell");
  }
}

function rangeName(r: ChartRange) {
  return t(`grow.range${r}`);
}
