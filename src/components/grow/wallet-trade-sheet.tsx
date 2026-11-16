"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, Wallet } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { AmountDisplay, amountToCents, Keypad, QuickChips } from "@/components/ui/keypad";
import { ConnectWallet } from "@/components/money/connect-wallet";
import { api, ApiClientError, invalidate, newIdempotencyKey } from "@/lib/client/api";
import { useAppState } from "@/lib/client/hooks";
import { formatMoney, formatPrice, formatShares } from "@/lib/format";
import type { OwnedTrade, PaymentQuote, Quote } from "@/lib/types";
import { t } from "@/i18n";

type Side = "buy" | "sell";
type Step = "amount" | "review" | "filled";

interface Order {
  symbol: string;
  side: Side;
  amountCents: number;
  shares: number;
  price: number;
  signature: string;
}
interface QuoteRes {
  quote: PaymentQuote;
  order: Order;
}

const MIN_CENTS = 100;

/**
 * Buy or sell with your own wallet: amount → review (real Interledger quote with
 * fees) → filled. Buys pay from your wallet to Sprout's; sells pay back to yours.
 */
export function WalletTradeSheet({
  open,
  onOpenChange,
  quote,
  positionCents,
  initialSide = "buy",
  chips = [5, 10, 25],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quote: Quote;
  positionCents: number;
  initialSide?: Side;
  chips?: number[];
}) {
  const { wallet } = useAppState();
  const [side, setSide] = useState<Side>(initialSide);
  const [amount, setAmount] = useState("");
  const [sellAll, setSellAll] = useState(false);
  const [step, setStep] = useState<Step>("amount");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idem, setIdem] = useState(() => newIdempotencyKey());
  const [pending, setPending] = useState<QuoteRes | null>(null);
  const [trade, setTrade] = useState<OwnedTrade | null>(null);

  const cents = sellAll ? positionCents : amountToCents(amount);

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setStep("amount");
      setError(null);
      setPending(null);
      setTrade(null);
      setSellAll(false);
      setAmount("");
      setIdem(newIdempotencyKey());
    }
  };

  const review = async () => {
    if (cents < MIN_CENTS) return setError(t("grow.errMin", { min: formatMoney(MIN_CENTS) }));
    if (side === "sell" && cents > positionCents) return setError(t("grow.errPosition"));
    setBusy(true);
    setError(null);
    try {
      const res = await api<QuoteRes>("/api/invest/quote", {
        method: "POST",
        body: { symbol: quote.symbol, side, amountCents: cents, sellAll: side === "sell" && sellAll },
      });
      setPending(res);
      setStep("review");
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };

  const place = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ trade: OwnedTrade }>("/api/invest/execute", {
        method: "POST",
        body: { quote: pending.quote, order: pending.order, idempotencyKey: idem },
      });
      setTrade(res.trade);
      setStep("filled");
      invalidate("/api/wallet");
      invalidate("/api/portfolio");
    } catch (e) {
      const err = e instanceof ApiClientError ? e : null;
      // An expired quote just needs a fresh one; anything else, show and let them retry.
      if (err?.code === "quote_expired") {
        setStep("amount");
        setError(t("invest.quoteExpired"));
      } else {
        setError(err?.message ?? t("app.genericError"));
      }
    } finally {
      setBusy(false);
    }
  };

  const title =
    step === "filled" ? t("grow.filled") : step === "review" ? t("grow.reviewTitle") : side === "buy" ? t("grow.buyTitle", { symbol: quote.symbol }) : t("grow.sellTitle", { symbol: quote.symbol });

  if (!wallet) {
    return (
      <Sheet open={open} onOpenChange={close} title={t("invest.connectTitle")} description={t("invest.connectBody")}>
        <ConnectWallet returnTo="/grow" />
      </Sheet>
    );
  }

  const q = pending?.quote;
  const o = pending?.order;
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
            sub={
              <span className="tnum">
                {side === "buy" ? t("invest.fromWallet", { wallet: wallet.url.replace(/^https:\/\//, "") }) : t("grow.positionAvailable", { amount: formatMoney(positionCents) })}
              </span>
            }
          />
          {error && (
            <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-negative-soft p-3 text-body text-negative">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          {side === "buy" ? (
            <QuickChips amounts={chips} onPick={(n) => { setAmount(String(n)); setError(null); }} />
          ) : (
            <div className="flex justify-center">
              <Button variant={sellAll ? "primary" : "outline"} aria-pressed={sellAll} onClick={() => { setSellAll((s) => !s); setError(null); }}>
                {t("grow.sellAll")}
              </Button>
            </div>
          )}
          <div className="mt-3">
            <Keypad value={amount} onChange={(v) => { setAmount(v); setSellAll(false); setError(null); }} maxCents={side === "buy" ? 50_000 : Math.max(positionCents, 100)} label={t("grow.amountLabel")} />
          </div>
          <Button size="lg" className="mt-3" onClick={review} disabled={cents === 0} loading={busy} loadingText={t("invest.gettingQuote")}>
            {t("grow.reviewOrder")}
          </Button>
          <p className="mt-2 text-center text-caption text-muted-foreground">{t("invest.testNote")}</p>
        </div>
      )}

      {step === "review" && q && o && (
        <div className="space-y-4">
          <dl className="divide-y divide-border rounded-2xl border border-border">
            <Row label={side === "buy" ? t("grow.buy") : t("grow.sell")} value={`${quote.name} (${quote.symbol})`} />
            <Row label={t("grow.amountLabel")} value={formatMoney(o.amountCents)} strong />
            <Row label={t("grow.price")} value={formatPrice(o.price)} />
            <Row label={t("grow.estShares")} value={formatShares(o.shares)} />
            <Row label={t("invest.networkFee")} value={formatMoney(q.feeCents)} />
            {side === "buy" ? (
              <Row label={t("invest.totalFromWallet")} value={formatMoney(q.debitCents)} strong />
            ) : (
              <Row label={t("invest.toWallet")} value={formatMoney(q.receive.value)} strong />
            )}
          </dl>
          <p className="flex items-start gap-2 text-caption text-muted-foreground">
            <Wallet className="mt-0.5 size-4 shrink-0" aria-hidden />
            {side === "buy" ? t("invest.reviewBuyNote") : t("invest.reviewSellNote")}
          </p>
          {error && (
            <p role="alert" className="text-body text-negative">
              {error}
            </p>
          )}
          <Button size="lg" onClick={place} loading={busy} loadingText={t("invest.paying")}>
            {side === "buy" ? t("invest.payAndBuy", { amount: formatMoney(q.debitCents) }) : t("invest.sellAndReceive", { amount: formatMoney(q.receive.value) })}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setStep("amount")}>
            {t("app.back")}
          </Button>
        </div>
      )}

      {step === "filled" && trade && (
        <div className="space-y-4">
          <p role="status" className="flex items-start gap-2 rounded-2xl bg-secondary p-4 text-body">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            {t("grow.filledBody", {
              side: trade.side === "buy" ? t("grow.boughtWord") : t("grow.soldWord"),
              shares: formatShares(trade.shares),
              symbol: trade.symbol,
              price: formatPrice(trade.price),
            })}
          </p>
          <p className="text-caption text-muted-foreground">{trade.side === "buy" ? t("invest.filledBuyNote") : t("invest.filledSellNote")}</p>
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
