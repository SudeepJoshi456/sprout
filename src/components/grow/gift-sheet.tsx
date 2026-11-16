"use client";

import { useState } from "react";
import { CircleAlert, Gift } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { QuickChips } from "@/components/ui/keypad";
import { ConnectWallet } from "@/components/money/connect-wallet";
import { api, ApiClientError, invalidate, newIdempotencyKey } from "@/lib/client/api";
import { useAppState } from "@/lib/client/hooks";
import { formatMoney, formatPrice, formatShares } from "@/lib/format";
import type { PaymentQuote, Quote } from "@/lib/types";
import { t } from "@/i18n";

type Step = "details" | "review" | "sent";
interface QuoteRes {
  quote: PaymentQuote;
  order: { symbol: string; amountCents: number; shares: number; price: number; signature: string };
  recipientName: string;
}

/**
 * Gift a stock: pick a friend by @username, an amount and a note. You pay like a
 * normal buy (over Interledger when live); the shares land in your friend's account.
 */
export function GiftSheet({ open, onOpenChange, quote, brandName }: { open: boolean; onOpenChange: (o: boolean) => void; quote: Quote; brandName: string }) {
  const { wallet, modes } = useAppState();
  const [handle, setHandle] = useState("");
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<Step>("details");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idem, setIdem] = useState(() => newIdempotencyKey());
  const [pending, setPending] = useState<QuoteRes | null>(null);

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setStep("details");
      setError(null);
      setPending(null);
      setHandle("");
      setMessage("");
      setIdem(newIdempotencyKey());
    }
  };

  const review = async () => {
    const to = handle.trim().replace(/^@/, "");
    if (!to) return setError(t("gift.needHandle"));
    setBusy(true);
    setError(null);
    try {
      const res = await api<QuoteRes>("/api/invest/quote", { method: "POST", body: { symbol: quote.symbol, side: "buy", amountCents: amount * 100, giftTo: to } });
      setPending(res);
      setStep("review");
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/invest/execute", { method: "POST", body: { quote: pending.quote, order: pending.order, idempotencyKey: idem, message: message.trim() || undefined } });
      setStep("sent");
      invalidate("/api/wallet");
    } catch (e) {
      const err = e instanceof ApiClientError ? e : null;
      if (err?.code === "quote_expired") {
        setStep("details");
        setError(t("invest.quoteExpired"));
      } else setError(err?.message ?? t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };

  if (modes.invest === "wallet" && !wallet) {
    return (
      <Sheet open={open} onOpenChange={close} title={t("invest.connectTitle")} description={t("invest.connectBody")}>
        <ConnectWallet returnTo="/grow" />
      </Sheet>
    );
  }

  const q = pending?.quote;
  return (
    <Sheet open={open} onOpenChange={close} title={step === "sent" ? t("gift.sentTitle") : t("gift.title", { name: brandName })}>
      {step === "details" && (
        <div className="space-y-4">
          <Field label={t("gift.to")} placeholder="@username" autoCapitalize="none" autoCorrect="off" value={handle} onChange={(e) => { setHandle(e.target.value); setError(null); }} />
          <div>
            <p className="mb-2 text-body font-semibold">{t("gift.amount")}</p>
            <QuickChips amounts={[5, 10, 25]} selected={amount} onPick={(n) => setAmount(n)} />
          </div>
          <Field label={t("gift.message")} placeholder={t("gift.messagePlaceholder")} maxLength={140} value={message} onChange={(e) => setMessage(e.target.value)} />
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-negative-soft p-3 text-body text-negative">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          <Button size="lg" onClick={review} loading={busy} loadingText={t("invest.gettingQuote")}>
            {t("gift.review", { amount: formatMoney(amount * 100, { trimZeroCents: true }) })}
          </Button>
          <p className="text-center text-caption text-muted-foreground">{modes.invest === "wallet" ? t("invest.testNote") : t("gift.practiceNote")}</p>
        </div>
      )}

      {step === "review" && pending && q && (
        <div className="space-y-4">
          <dl className="divide-y divide-border rounded-2xl border border-border">
            <Row label={t("gift.for")} value={pending.recipientName} />
            <Row label={t("gift.stock")} value={`${quote.name} (${quote.symbol})`} />
            <Row label={t("grow.amountLabel")} value={formatMoney(pending.order.amountCents)} strong />
            <Row label={t("grow.estShares")} value={`${formatShares(pending.order.shares)} at ${formatPrice(pending.order.price)}`} />
            <Row label={t("invest.networkFee")} value={formatMoney(q.feeCents)} />
            <Row label={t("invest.totalFromWallet")} value={formatMoney(q.debitCents)} strong />
          </dl>
          {message.trim() && <p className="rounded-xl bg-muted p-3 text-body">“{message.trim()}”</p>}
          {error && (
            <p role="alert" className="text-body text-negative">
              {error}
            </p>
          )}
          <Button size="lg" onClick={send} loading={busy} loadingText={t("invest.paying")}>
            {t("gift.send", { amount: formatMoney(q.debitCents) })}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setStep("details")}>
            {t("app.back")}
          </Button>
        </div>
      )}

      {step === "sent" && pending && (
        <div className="space-y-4 text-center">
          <Gift className="mx-auto size-10 text-primary" aria-hidden />
          <p role="status" className="text-body">
            {t("gift.sentBody", { name: pending.recipientName, amount: formatMoney(pending.order.amountCents), brand: brandName })}
          </p>
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
