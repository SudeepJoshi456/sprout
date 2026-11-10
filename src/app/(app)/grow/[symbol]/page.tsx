"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Compass, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Screen } from "@/components/shell/screen";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { LineChart } from "@/components/ui/chart";
import { Change, Money } from "@/components/ui/money";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { Term } from "@/components/ui/term";
import { Badge } from "@/components/ui/badge";
import { PracticeBanner } from "@/components/grow/practice";
import { TradeSheet } from "@/components/grow/trade-sheet";
import { api } from "@/lib/client/api";
import { useAppState, useResource } from "@/lib/client/hooks";
import { cn, formatDate, formatDateTime, formatPrice, formatShares, formatTime } from "@/lib/format";
import { TICKER_MAP } from "@/data/tickers";
import type { HistoryResponse, PortfolioResponse } from "@/lib/api-types";
import type { ChartRange } from "@/lib/types";
import { t, type MessageKey } from "@/i18n";

const RANGES: ChartRange[] = ["1D", "1W", "1M", "1Y"];

const TOUR: Array<{ id: string; title: MessageKey; body: MessageKey }> = [
  { id: "price", title: "tour.priceTitle", body: "tour.priceBody" },
  { id: "change", title: "tour.changeTitle", body: "tour.changeBody" },
  { id: "chart", title: "tour.chartTitle", body: "tour.chartBody" },
  { id: "about", title: "tour.aboutTitle", body: "tour.aboutBody" },
  { id: "stats", title: "tour.statsTitle", body: "tour.statsBody" },
  { id: "buy", title: "tour.buyTitle", body: "tour.buyBody" },
];

/** Asset page: price, chart, plain-language summary, stats, and practice trading. */
export default function AssetPage() {
  return (
    <Suspense>
      <Asset />
    </Suspense>
  );
}

function Asset() {
  const { symbol: raw } = useParams<{ symbol: string }>();
  const symbol = raw.toUpperCase();
  const params = useSearchParams();
  const router = useRouter();
  const { userId } = useAppState();
  const [range, setRange] = useState<ChartRange>("1M");
  const history = useResource<HistoryResponse>(`/api/market/history?symbol=${symbol}&range=${range}`);
  const about = useResource<{ about: string; source: "ai" | "prewritten" }>(`/api/market/about?symbol=${symbol}`);
  const portfolio = useResource<PortfolioResponse>(`/api/portfolio?range=1D&u=${userId}`);

  const tradeParam = params.get("trade");
  const [tradeOpen, setTradeOpen] = useState(tradeParam === "buy" || tradeParam === "sell");
  const [side, setSide] = useState<"buy" | "sell">(tradeParam === "sell" ? "sell" : "buy");
  const [tourStep, setTourStep] = useState<number | null>(params.get("tour") === "stock-page" ? 0 : null);

  const info = TICKER_MAP[symbol];
  const quote = history.data?.quote;
  const view = portfolio.data?.portfolio.view;
  const holding = view?.holdings.find((h) => h.symbol === symbol);
  const spot = tourStep !== null ? TOUR[tourStep].id : null;

  const endTour = async (completed: boolean) => {
    setTourStep(null);
    router.replace(`/grow/${symbol}`, { scroll: false });
    if (completed) {
      try {
        await api("/api/walkthroughs/stock-page", { method: "POST" });
        toast.success(t("grow.tourEnd"));
      } catch {
        /* progress is cosmetic; don't block the user */
      }
    }
  };

  const openTrade = (s: "buy" | "sell") => {
    setSide(s);
    setTradeOpen(true);
  };

  if (history.error && !quote) {
    return (
      <Screen title={info?.name ?? symbol} back="/grow">
        <Card className="mt-4">
          <p className="text-body">{history.error.status === 404 ? t("grow.unknownSymbol") : t("grow.loadError")}</p>
          <Button variant="secondary" className="mt-3" onClick={() => history.reload()}>
            {t("app.retry")}
          </Button>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title={info?.name ?? symbol}
      back="/grow"
      banner={<PracticeBanner />}
      actions={
        tourStep === null && (
          <button
            type="button"
            onClick={() => setTourStep(0)}
            aria-label={t("grow.tourStart")}
            className="inline-flex size-11 items-center justify-center rounded-full text-primary hover:bg-muted"
          >
            <Compass className="size-5" aria-hidden />
          </button>
        )
      }
      footer={
        <div className="space-y-3">
          {tourStep !== null && (
            <TourCard
              step={tourStep}
              onBack={() => setTourStep((s) => Math.max(0, (s ?? 0) - 1))}
              onNext={() => (tourStep === TOUR.length - 1 ? endTour(true) : setTourStep(tourStep + 1))}
              onSkip={() => endTour(false)}
            />
          )}
          <Spot active={spot === "buy"}>
            <div className="flex gap-2">
              {holding && (
                <Button variant="outline" size="lg" className="flex-1" onClick={() => openTrade("sell")} disabled={!quote}>
                  {t("grow.sell")}
                </Button>
              )}
              <Button size="lg" className="flex-1" onClick={() => openTrade("buy")} disabled={!quote}>
                {t("grow.buy")}
              </Button>
            </div>
          </Spot>
        </div>
      }
    >
      <div className="space-y-4 pt-3">
        {!quote ? (
          <div className="space-y-3" aria-hidden>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <section aria-label={t("grow.price")}>
            <p className="text-caption font-semibold text-muted-foreground">
              {quote.symbol} · {quote.kind === "etf" ? t("grow.typeEtf") : t("grow.typeStock")}
            </p>
            <Spot active={spot === "price"}>
              <p className="font-display text-display font-semibold tnum">{formatPrice(quote.price)}</p>
              <p className="text-caption text-muted-foreground">
                <Term id="delayed-price">{t("grow.delayed", { time: formatDateTime(quote.asOf) })}</Term>
                {quote.freshness === "snapshot" && ` · ${t("grow.snapshotNote")}`}
              </p>
            </Spot>
            <Spot active={spot === "change"} className="mt-1 inline-block">
              <Change cents={Math.round(quote.change * 100)} pct={quote.changePct} suffix={t("home.todayWord")} />
            </Spot>
            <Spot active={spot === "chart"} className="mt-4 block">
              {history.data && history.data.points.length > 1 ? (
                <LineChart
                  points={history.data.points}
                  label={t("grow.chartLabel", { range: t(`grow.range${range}`) })}
                  formatValue={formatPrice}
                  formatTime={(ts) => (range === "1D" ? formatTime(ts) : range === "1W" ? formatDateTime(ts) : formatDate(ts))}
                  height={170}
                />
              ) : (
                <Skeleton className="h-[170px] w-full" />
              )}
              <Segmented<ChartRange>
                label={t("grow.chartRange")}
                role="radiogroup"
                value={range}
                onChange={setRange}
                className="mt-3"
                options={RANGES.map((r) => ({ value: r, label: r }))}
              />
            </Spot>
          </section>
        )}

        {holding && (
          <Card aria-labelledby="pos-title">
            <CardHeader id="pos-title" title={t("grow.yourPosition")} />
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-caption text-muted-foreground">{t("grow.positionValue")}</dt>
                <dd className="text-body font-semibold">
                  <Money cents={holding.valueCents} />
                </dd>
                <dd className="text-caption text-muted-foreground">{t("grow.shares", { shares: formatShares(holding.shares) })}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">{t("grow.positionGain")}</dt>
                <dd>
                  <Change cents={holding.gainCents} pct={holding.gainPct} size="caption" />
                </dd>
              </div>
            </dl>
          </Card>
        )}

        <Spot active={spot === "about"} className="block">
          <Card aria-labelledby="about-title">
            <CardHeader
              id="about-title"
              title={info?.kind === "etf" ? t("grow.aboutFund") : t("grow.aboutCompany")}
              action={about.data?.source === "ai" ? <Badge tone="info" icon={<Sparkles className="size-3" aria-hidden />}>AI</Badge> : undefined}
            />
            {about.loading ? (
              <SkeletonCard lines={3} className="border-0 p-0 shadow-none" />
            ) : (
              <p className="text-body">{about.data?.about || info?.about}</p>
            )}
            {about.data?.source === "ai" && <p className="mt-2 text-caption text-muted-foreground">{t("grow.aboutAi")}</p>}
            {info?.kind === "etf" && (
              <Link href="/learn/index-funds" className="mt-3 inline-flex min-h-11 items-center text-body font-semibold text-primary">
                {t("grow.viewLesson")}
              </Link>
            )}
          </Card>
        </Spot>

        {quote && (
          <Spot active={spot === "stats"} className="block">
            <Card aria-labelledby="stats-title">
              <CardHeader id="stats-title" title={t("grow.stats")} />
              <dl className="divide-y divide-border">
                <Stat label={t("grow.statPrev")} value={formatPrice(quote.prevClose)} />
                {quote.low52 !== null && quote.high52 !== null && (
                  <Stat label={<Term id="52-week-range">{t("grow.statRange")}</Term>} value={`${formatPrice(quote.low52)} – ${formatPrice(quote.high52)}`} />
                )}
                <Stat
                  label={t("grow.statType")}
                  value={quote.kind === "etf" ? <Term id="etf">{t("grow.typeEtf")}</Term> : <Term id="stock">{t("grow.typeStock")}</Term>}
                />
                <Stat label={t("grow.statSector")} value={quote.sector} />
              </dl>
            </Card>
          </Spot>
        )}

        <p className="text-center text-caption text-muted-foreground">{t("grow.noAdvice")}</p>
      </div>

      {quote && view && (
        <TradeSheet
          key={side}
          open={tradeOpen}
          onOpenChange={(o) => {
            setTradeOpen(o);
            if (!o && tradeParam) router.replace(`/grow/${symbol}`, { scroll: false });
          }}
          quote={quote}
          cashCents={view.cashCents}
          positionCents={holding?.valueCents ?? 0}
          initialSide={side}
          initialAmount={tradeParam ? (params.get("amount") ?? "").replace(/[^\d.]/g, "") : ""}
        />
      )}
    </Screen>
  );
}

/** Highlights the section the walkthrough is describing and scrolls it into view. */
function Spot({ active, children, className }: { active: boolean; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active]);
  return (
    <div ref={ref} className={cn("rounded-2xl transition-shadow duration-200", active && "relative z-10 ring-2 ring-primary ring-offset-4 ring-offset-background", className)}>
      {children}
    </div>
  );
}

function TourCard({ step, onBack, onNext, onSkip }: { step: number; onBack: () => void; onNext: () => void; onSkip: () => void }) {
  const s = TOUR[step];
  const last = step === TOUR.length - 1;
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="tour-title" className="rounded-2xl border border-primary/30 bg-card p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <Badge tone="info">{t("grow.tourBadge")}</Badge>
        <span className="text-caption text-muted-foreground">{t("tour.step", { n: step + 1, total: TOUR.length })}</span>
      </div>
      <div aria-live="polite">
        <p id="tour-title" className="mt-2 text-body font-semibold">
          {t(s.title)}
        </p>
        <p className="mt-1 text-body text-muted-foreground">{t(s.body)}</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button variant="ghost" onClick={onSkip}>
          {t("tour.skip")}
        </Button>
        <span className="flex-1" />
        {step > 0 && (
          <Button variant="outline" onClick={onBack}>
            {t("tour.back")}
          </Button>
        )}
        <Button onClick={onNext}>{last ? t("tour.finish") : t("tour.next")}</Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-body text-muted-foreground">{label}</dt>
      <dd className="tnum text-right text-body font-semibold">{value}</dd>
    </div>
  );
}
