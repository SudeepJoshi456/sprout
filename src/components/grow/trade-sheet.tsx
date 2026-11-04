"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { AmountDisplay, amountToCents, Keypad, QuickChips } from "@/components/ui/keypad";
import { api, ApiClientError, invalidate, newIdempotencyKey } from "@/lib/client/api";
import { formatMoney, formatPrice, formatShares } from "@/lib/format";
import { MIN_TRADE_CENTS } from "@/lib/portfolio";
import type { TradeResponse } from "@/lib/api-types";
import type { Quote } from "@/lib/types";
import { t } from "@/i18n";

type Side = "buy" | "sell";
type Step = "amount" | "review" | "filled";

/**
 * Practice trade: amount → review → filled. Deliberately calm: no confetti,
 * no streaks for trading, and a review screen before every order.
 */
export function TradeSheet({
  open,
  onOpenChange,
  quote,
  cashCents,
  positionCents,
  initialSide = "buy",
  initialAmount = "",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quote: Quote;
  cashCents: number;
  positionCents: number;
  initialSide?: Side;
  initialAmount?: string;
}) {
  const [side, setSide] = useState<Side>(initialSide);
  const [amount, setAmount] = useState(initialAmount);
  const [sellAll, setSellAll] = useState(false);
  const [step, setStep] = useState<Step>("amount");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idem, setIdem] = useState(() => newIdempotencyKey());
  const [result, setResult] = useState<TradeResponse | null>(null);

  const cents = sellAll ? positionCents : amountToCents(amount);
  const max = side === "buy" ? cashCents : positionCents;
  const estShares = quote.price > 0 ? cents / 100 / quote.price : 0;

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setStep("amount");
      setError(null);
      setResult(null);
      setSellAll(false);
      setAmount("");
      setIdem(newIdempotencyKey());
    }
  };

  const review = () => {
    if (cents < MIN_TRADE_CENTS) return setError(t("grow.errMin", { min: formatMoney(MIN_TRADE_CENTS) }));
    if (cents > max) return setError(side === "buy" ? t("grow.errSeeds") : t("grow.errPosition"));
    setError(null);
    setStep("review");
  };

  const place = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<TradeResponse>("/api/trades", {
        method: "POST",
        body: { symbol: quote.symbol, side, amountCents: cents, idempotencyKey: idem, sellAll: side === "sell" && sellAll },
      });
      setResult(res);
      setStep("filled");
      invalidate("/api/portfolio");
      invalidate("/api/lessons");
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };

  const title = step === "filled" ? t("grow.filled") : step === "review" ? t("grow.reviewTitle") : side === "buy" ? t("grow.buyTitle", { symbol: quote.symbol }) : t("grow.sellTitle", { symbol: quote.symbol });

  return (
    <Sheet open={open} onOpenChange={close} title={title}>
      {step === "amount" && (
        <div>
          {positionCents > 0 && (
            <Segmented<Side>
              label={t("grow.sideLabel")}
              role="radiogroup"
              value={side}
              onChange={(s) => {
                setSide(s);
                setSellAll(false);
                setError(null);
              }}
              options={[
                { value: "buy", label: t("grow.buy") },
                { value: "sell", label: t("grow.sell") },
              ]}
            />
          )}
          <AmountDisplay
            value={sellAll ? String(positionCents / 100) : amount}
            label={t("grow.amountLabel")}
            sub={<span className="tnum">{side === "buy" ? t("grow.seedsAvailable", { amount: formatMoney(cashCents) }) : t("grow.positionAvailable", { amount: formatMoney(positionCents) })}</span>}
          />
          {error && (
            <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-negative-soft p-3 text-body text-negative">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          {side === "buy" ? (
            <QuickChips amounts={[10, 50, 100, 500]} onPick={(n) => { setAmount(String(n)); setError(null); }} />
          ) : (
            <div className="flex justify-center">
              <Button variant={sellAll ? "primary" : "outline"} aria-pressed={sellAll} onClick={() => { setSellAll((s) => !s); setError(null); }}>
                {t("grow.sellAll")}
              </Button>
            </div>
          )}
          <div className="mt-3">
            <Keypad value={amount} onChange={(v) => { setAmount(v); setSellAll(false); setError(null); }} maxCents={Math.max(max, 100)} label={t("grow.amountLabel")} />
          </div>
          <Button size="lg" className="mt-3" onClick={review} disabled={cents === 0}>
            {t("grow.reviewOrder")}
          </Button>
          <p className="mt-2 text-center text-caption text-muted-foreground">{t("grow.noAdvice")}</p>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <dl className="divide-y divide-border rounded-2xl border border-border">
            <Row label={side === "buy" ? t("grow.buy") : t("grow.sell")} value={`${quote.name} (${quote.symbol})`} />
            <Row label={t("grow.amountLabel")} value={formatMoney(cents)} strong />
            <Row label={t("grow.price")} value={formatPrice(quote.price)} />
            <Row label={t("grow.estShares")} value={formatShares(Math.round(estShares * 1e6) / 1e6)} />
            <Row label={t("grow.noFees")} value={formatMoney(0)} />
            <Row label={t("grow.seedsAfter")} value={formatMoney(side === "buy" ? cashCents - cents : cashCents + cents)} />
          </dl>
          <p className="text-caption text-muted-foreground">{t("grow.reviewNote")}</p>
          {error && (
            <p role="alert" className="text-body text-negative">
              {error}
            </p>
          )}
          <Button size="lg" onClick={place} loading={busy} loadingText={t("grow.placing")}>
            {t("grow.placeOrder", { side: side === "buy" ? t("grow.buyWord") : t("grow.sellWord") })}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setStep("amount")}>
            {t("app.back")}
          </Button>
        </div>
      )}

      {step === "filled" && result && (
        <div className="space-y-4">
          <p role="status" className="flex items-start gap-2 rounded-2xl bg-secondary p-4 text-body">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            {t("grow.filledBody", {
              side: result.trade.side === "buy" ? t("grow.boughtWord") : t("grow.soldWord"),
              shares: formatShares(result.trade.shares),
              symbol: result.trade.symbol,
              price: formatPrice(result.trade.price),
            })}
          </p>
          {result.coach && (
            <div className="rounded-2xl border border-practice/25 bg-practice-soft p-4">
              <p className="text-caption font-semibold uppercase tracking-wide text-practice">{t("grow.coach")}</p>
              <p className="mt-1 text-body font-semibold">{result.coach.title}</p>
              <p className="mt-1 text-body">{result.coach.body}</p>
              <p className="mt-2 text-caption text-muted-foreground">{t("app.practiceBanner")}</p>
            </div>
          )}
          <Button size="lg" onClick={() => close(false)}>
            {t("app.done")}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-body text-muted-foreground">{label}</dt>
      <dd className={`tnum text-right text-body ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
