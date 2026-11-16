"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Layers, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { SectionTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandMark, BrandPicker } from "@/components/grow/brand-tile";
import { QuoteRow } from "@/components/grow/practice";
import { BRAND_MAP, BRANDS, MIN_BRANDS, SP500_FUND } from "@/data/brands";
import { api, ApiClientError } from "@/lib/client/api";
import { useAppState, useResource } from "@/lib/client/hooks";
import { cn, formatMoney, formatPercent, formatPrice, formatShares } from "@/lib/format";
import type { QuotesResponse } from "@/lib/api-types";
import type { Quote } from "@/lib/types";
import { t } from "@/i18n";

/** Saves the brand list to the profile. */
async function saveBrands(brands: string[]) {
  try {
    await api("/api/profile", { method: "PATCH", body: { brands } });
    return true;
  } catch (e) {
    toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    return false;
  }
}

function useBrandQuotes(symbols: string[]) {
  const key = symbols.length ? `/api/market/quotes?symbols=${symbols.join(",")}` : null;
  const res = useResource<QuotesResponse>(key);
  const bySymbol = Object.fromEntries((res.data?.quotes ?? []).map((q) => [q.symbol, q])) as Record<string, Quote>;
  return { bySymbol, loading: res.loading && !res.data };
}

/** Invest → Your brands: the brands you picked, the index-fund insight, and more to explore. */
export function YourBrands() {
  const { user } = useAppState();
  const mine = user.profile.brands.filter((s) => BRAND_MAP[s]);
  const [editing, setEditing] = useState(false);

  if (mine.length === 0) return <PickFirstBrands />;

  const others = BRANDS.filter((b) => !mine.includes(b.symbol)).map((b) => b.symbol);
  return (
    <div className="space-y-5">
      <OwnedCard />
      <section aria-labelledby="yb-title">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 id="yb-title" className="text-body font-semibold">
            {t("brands.yours")}
          </h2>
          <Button variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden />
            {t("brands.edit")}
          </Button>
        </div>
        <BrandGrid symbols={mine} />
      </section>

      <IndexInsight symbols={mine} />

      <section aria-labelledby="yb-more">
        <SectionTitle id="yb-more">{t("brands.more")}</SectionTitle>
        <QuoteList symbols={others} />
      </section>

      <p className="text-center text-caption text-muted-foreground">{t("brands.notAdvice")}</p>
      <EditBrandsSheet open={editing} onOpenChange={setEditing} initial={mine} />
    </div>
  );
}

function PickFirstBrands() {
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const enough = picked.length >= MIN_BRANDS;
  return (
    <section aria-labelledby="pick-title" className="space-y-4">
      <div className="px-1">
        <h2 id="pick-title" className="font-display text-title font-semibold">
          {t("onboarding.brands.title")}
        </h2>
        <p className="mt-1 text-body text-muted-foreground">{t("onboarding.brands.sub", { n: MIN_BRANDS })}</p>
      </div>
      <BrandPicker selected={picked} onChange={setPicked} label={t("onboarding.brands.title")} />
      <Button
        size="lg"
        disabled={!enough}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          await saveBrands(picked);
          setBusy(false);
        }}
      >
        {enough ? t("brands.save") : t("onboarding.brands.pickMore", { n: MIN_BRANDS - picked.length })}
      </Button>
    </section>
  );
}

function EditBrandsSheet({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (o: boolean) => void; initial: string[] }) {
  const [picked, setPicked] = useState(initial);
  const [busy, setBusy] = useState(false);
  const enough = picked.length >= MIN_BRANDS;
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) setPicked(initial);
        onOpenChange(o);
      }}
      title={t("brands.editTitle")}
      description={t("onboarding.brands.sub", { n: MIN_BRANDS })}
      footer={
        <Button
          size="lg"
          disabled={!enough}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await saveBrands(picked);
            setBusy(false);
            if (ok) onOpenChange(false);
          }}
        >
          {enough ? t("brands.save") : t("onboarding.brands.pickMore", { n: MIN_BRANDS - picked.length })}
        </Button>
      }
    >
      <BrandPicker selected={picked} onChange={setPicked} label={t("brands.editTitle")} />
    </Sheet>
  );
}

/** In wallet mode: what you've bought with your own wallet, at today's prices. */
function OwnedCard() {
  const { user, modes } = useAppState();
  const holdings = (user.owned?.holdings ?? []).filter((h) => h.shares > 0);
  const { bySymbol } = useBrandQuotes(holdings.map((h) => h.symbol));
  if (modes.invest !== "wallet" && holdings.length === 0) return null;
  const total = holdings.reduce((sum, h) => sum + Math.round(h.shares * (bySymbol[h.symbol]?.price ?? 0) * 100), 0);
  return (
    <section aria-labelledby="owned-title" className="rounded-2xl border border-border/70 bg-card p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="owned-title" className="text-body font-semibold">
          {t("invest.owned")}
        </h2>
        {holdings.length > 0 && <span className="tnum font-display text-title font-semibold">{formatMoney(total)}</span>}
      </div>
      {holdings.length === 0 ? (
        <p className="mt-1 text-body text-muted-foreground">{t("invest.ownedEmpty")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {holdings.map((h) => {
            const brand = BRAND_MAP[h.symbol];
            const value = Math.round(h.shares * (bySymbol[h.symbol]?.price ?? 0) * 100);
            return (
              <li key={h.symbol}>
                <Link href={`/grow/${h.symbol}`} className="flex min-h-14 items-center gap-3 py-2">
                  {brand ? <BrandMark brand={brand} size="sm" /> : <span className="w-9 text-caption font-bold">{h.symbol}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold">{brand?.name ?? h.symbol}</span>
                    <span className="block text-caption text-muted-foreground">{t("grow.shares", { shares: formatShares(h.shares) })}</span>
                  </span>
                  <span className="tnum text-body font-semibold">{bySymbol[h.symbol] ? formatMoney(value) : "…"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Two-column grid of brand cards with today's price move. */
export function BrandGrid({ symbols }: { symbols: string[] }) {
  const { bySymbol, loading } = useBrandQuotes(symbols);
  return (
    <ul className="grid grid-cols-2 gap-2.5">
      {symbols.map((s) => {
        const brand = BRAND_MAP[s];
        const q = bySymbol[s];
        if (!brand) return null;
        return (
          <li key={s}>
            <Link href={`/grow/${s}`} className="flex min-h-28 flex-col gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-card hover:border-primary">
              <span className="flex items-center gap-2">
                <BrandMark brand={brand} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-body font-semibold">{brand.name}</span>
                  <span className="block text-caption text-muted-foreground">{s}</span>
                </span>
              </span>
              <span className="mt-auto">
                {q ? (
                  <>
                    <span className="tnum block text-body font-semibold">{formatPrice(q.price)}</span>
                    <DayMove pct={q.changePct} />
                  </>
                ) : loading ? (
                  <Skeleton className="h-9 w-2/3" />
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function DayMove({ pct, compact }: { pct: number; compact?: boolean }) {
  const up = pct > 0;
  const down = pct < 0;
  return (
    <span className={cn("tnum block text-caption font-semibold", up ? "text-positive" : down ? "text-negative" : "text-muted-foreground")}>
      {up ? "▲ " : down ? "▼ " : ""}
      {formatPercent(pct, { signed: true })}
      {!compact && ` ${t("home.todayWord")}`}
    </span>
  );
}

/** "4 of your 5 brands are in the S&P 500. One fund owns a slice of all of them." */
export function IndexInsight({ symbols }: { symbols: string[] }) {
  const inIndex = symbols.filter((s) => BRAND_MAP[s]?.inSP500);
  if (inIndex.length === 0) return null;
  const all = inIndex.length === symbols.length;
  return (
    <Link
      href={`/grow/${SP500_FUND}`}
      className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-accent/40 p-4 hover:border-primary"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
        <Layers className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold">
          {all ? t("brands.indexAll", { n: inIndex.length }) : t("brands.indexSome", { n: inIndex.length, total: symbols.length })}
        </span>
        <span className="mt-0.5 block text-caption text-foreground/80">{t("brands.indexBody", { fund: SP500_FUND })}</span>
      </span>
      <ChevronRight className="mt-3 size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

function QuoteList({ symbols }: { symbols: string[] }) {
  const { bySymbol, loading } = useBrandQuotes(symbols);
  if (loading) return <Skeleton className="h-40 w-full rounded-2xl" />;
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border/70 bg-card px-4">
      {symbols.map((s) =>
        bySymbol[s] ? (
          <li key={s}>
            <QuoteRow quote={bySymbol[s]} />
          </li>
        ) : null,
      )}
    </ul>
  );
}

/** Home: your first three brands, or a nudge to pick some. */
export function BrandsRow() {
  const { user } = useAppState();
  const mine = user.profile.brands.filter((s) => BRAND_MAP[s]);
  const { bySymbol } = useBrandQuotes(mine);
  return (
    <section aria-labelledby="home-brands">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 id="home-brands" className="text-body font-semibold">
          {t("brands.yours")}
        </h2>
        <Link href="/grow" className="text-caption font-semibold text-primary">
          {t("brands.seeAll")}
        </Link>
      </div>
      {mine.length === 0 ? (
        <Link href="/grow" className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-card p-4 hover:border-primary">
          <span className="flex -space-x-2">
            {BRANDS.slice(0, 3).map((b) => (
              <BrandMark key={b.symbol} brand={b} size="sm" className="ring-2 ring-card" />
            ))}
          </span>
          <span className="min-w-0 flex-1 text-body font-semibold">{t("brands.pickPrompt")}</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      ) : (
        <ul className="grid grid-cols-3 gap-2.5">
          {mine.slice(0, 3).map((s) => {
            const brand = BRAND_MAP[s];
            const q = bySymbol[s];
            return (
              <li key={s} className="min-w-0">
                <Link href={`/grow/${s}`} className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-border/70 bg-card p-3 shadow-card hover:border-primary">
                  <BrandMark brand={brand} size="sm" />
                  <span className="truncate text-body font-semibold">{brand.name}</span>
                  {q ? <DayMove pct={q.changePct} compact /> : <Skeleton className="h-4 w-3/4" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
