"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CircleAlert, CircleCheck, ClipboardPaste, Globe, Loader2, QrCode, Receipt, Share2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, SimulatedBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { AmountDisplay, amountToCents, Keypad, QuickChips } from "@/components/ui/keypad";
import { Sheet } from "@/components/ui/sheet";
import { TransferRow } from "@/components/money/rows";
import { PaymentTrace } from "./payment-trace";
import { TransferDetails } from "./transfer-details";
import { ScanSheet } from "./scan-sheet";
import { FX_PER_USD as FX_HINT } from "@/data/fx";
import { api, ApiClientError, newIdempotencyKey } from "@/lib/client/api";
import { useAppState, useReducedMotion } from "@/lib/client/hooks";
import { cn, formatDate, formatForeign, formatMoney } from "@/lib/format";
import type { PaymentQuote, PaymentStep, Transfer } from "@/lib/types";
import type { SendResponse } from "@/lib/api-types";
import { t } from "@/i18n";

interface Recipient {
  wallet: string;
  name: string;
  assetCode: string;
  contactId?: string;
}

type Stage = "recipient" | "amount" | "review" | "sending" | "receipt";

interface QuoteResult {
  quote: PaymentQuote;
  fellBack: boolean;
  steps: PaymentStep[];
}

const nameFromWallet = (url: string) => {
  try {
    const slug = new URL(url).pathname.split("/").filter(Boolean).pop() ?? url;
    return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return url;
  }
};

/** ★ Send: recipient → amount → review (real quote) → sending → receipt. */
export function SendFlow({ onStageChange }: { onStageChange?: (stage: Stage) => void }) {
  const { user, modes } = useAppState();
  const params = useSearchParams();
  const reduced = useReducedMotion();

  const [stage, setStage] = useState<Stage>("recipient");
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [billId, setBillId] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [idemKey, setIdemKey] = useState<string | null>(null);
  const [result, setResult] = useState<SendResponse | null>(null);
  const [detail, setDetail] = useState<Transfer | null>(null);
  const prefilled = useRef(false);

  useEffect(() => onStageChange?.(stage), [stage, onStageChange]);

  // Deep links: /move?to=…&amount=…&name=…&note=… (from request links) and ?bill=…
  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;
    const to = params.get("to");
    const bill = params.get("bill");
    const linkedBill = bill ? user.bills.find((b) => b.id === bill && !b.paid) : undefined;
    const contact = linkedBill?.payeeContactId ? user.contacts.find((c) => c.id === linkedBill.payeeContactId) : undefined;
    if (contact && linkedBill) {
      /* eslint-disable react-hooks/set-state-in-effect -- one-time prefill from the URL */
      setRecipient({ wallet: contact.walletAddress, name: contact.name, assetCode: contact.assetCode, contactId: contact.id });
      setBillId(linkedBill.id);
      setAmount(String(linkedBill.amountCents / 100));
      setStage("amount");
    } else if (to) {
      const known = user.contacts.find((c) => c.walletAddress === to);
      setRecipient({ wallet: to, name: params.get("name") || known?.name || nameFromWallet(to), assetCode: known?.assetCode ?? "USD", contactId: known?.id });
      const amt = params.get("amount");
      if (amt && /^\d+(\.\d{1,2})?$/.test(amt)) setAmount(String(Number(amt)));
      if (params.get("note")) setNote(params.get("note")!.slice(0, 140));
      setStage("amount");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [params, user.bills, user.contacts]);

  const reset = () => {
    setStage("recipient");
    setRecipient(null);
    setAmount("");
    setNote("");
    setBillId(null);
    setQuote(null);
    setIdemKey(null);
    setSendError(null);
    setAmountError(null);
    setResult(null);
  };

  const getQuote = async () => {
    if (!recipient) return;
    const cents = amountToCents(amount);
    if (cents < 100) return setAmountError(t("move.amountMin"));
    if (cents > user.account.balanceCents) return setAmountError(t("move.amountMax"));
    setQuoting(true);
    setAmountError(null);
    try {
      const res = await api<QuoteResult>("/api/payments/quote", {
        method: "POST",
        body: { receiver: recipient.wallet, amountCents: cents, name: recipient.name },
      });
      setQuote(res);
      // One idempotency key per reviewed payment, reused for every retry.
      setIdemKey(newIdempotencyKey());
      setSendError(null);
      setStage("review");
    } catch (err) {
      setAmountError(err instanceof ApiClientError ? err.message : t("app.genericError"));
    } finally {
      setQuoting(false);
    }
  };

  const send = async () => {
    if (!quote || !idemKey) return;
    setStage("sending");
    setSendError(null);
    try {
      const res = await api<SendResponse>("/api/payments/send", {
        method: "POST",
        body: { quote: quote.quote, idempotencyKey: idemKey, note: note.trim() || undefined, billId: billId ?? undefined, quoteSteps: quote.steps },
      });
      setResult(res);
      setStage("receipt");
    } catch (err) {
      const e = err instanceof ApiClientError ? err : new ApiClientError(0, "unknown", t("app.genericError"));
      if (e.code === "quote_expired" || e.code === "quote_invalid") {
        toast(t("move.quoteRefreshed"));
        setStage("amount");
        void getQuote();
        return;
      }
      if (e.code === "insufficient_funds") {
        setAmountError(e.message);
        setStage("amount");
        return;
      }
      setSendError(e.code === "network_error" || e.status === 0 ? t("move.errNetwork") : e.message);
      setStage("review");
    }
  };

  if (stage === "recipient") {
    return (
      <>
        <RecipientStep
          onPick={(r) => {
            setRecipient(r);
            setStage("amount");
          }}
        />
        <section aria-labelledby="activity-title" className="mt-8">
          <h2 id="activity-title" className="mb-1 text-body font-semibold">
            {t("move.activity")}
          </h2>
          {user.transfers.length === 0 ? (
            <p className="text-body text-muted-foreground">{t("move.activityEmpty")}</p>
          ) : (
            <div className="divide-y divide-border">
              {user.transfers.slice(0, 8).map((tr) => (
                <TransferRow key={tr.id} transfer={tr} onClick={() => setDetail(tr)} />
              ))}
            </div>
          )}
        </section>
        <Sheet open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)} title={t("move.detailTitle")}>
          {detail && <TransferDetails transfer={detail} />}
        </Sheet>
      </>
    );
  }

  if (stage === "amount" && recipient) {
    const bills = recipient.contactId ? user.bills.filter((b) => !b.paid && b.payeeContactId === recipient.contactId) : [];
    const cents = amountToCents(amount);
    return (
      <div className="flex min-h-full flex-col">
        <RecipientChip recipient={recipient} onChange={() => setStage("recipient")} />
        <AmountDisplay
          value={amount}
          label={t("move.amountLabel")}
          sub={
            <span className="tnum">
              {t("move.available", { amount: formatMoney(user.account.balanceCents) })}
              {recipient.assetCode !== "USD" && cents > 0 && (
                <span className="block text-caption">≈ {formatForeign(Math.round(cents * (FX_HINT[recipient.assetCode] ?? 1)), recipient.assetCode)} before fees</span>
              )}
            </span>
          }
        />
        {amountError && (
          <p role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-negative-soft p-3 text-body text-negative">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {amountError}
          </p>
        )}
        <QuickChips amounts={[10, 25, 50, 100]} onPick={(n) => { setAmount(String(n)); setAmountError(null); setBillId(null); }} />
        {bills.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label={t("move.billLink")}>
            {bills.map((b) => {
              const on = billId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setBillId(on ? null : b.id);
                    if (!on) setAmount(String(b.amountCents / 100));
                    setAmountError(null);
                  }}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-3 text-body font-medium",
                    on ? "border-primary bg-accent/50" : "border-dashed border-input",
                  )}
                >
                  <Receipt className="size-4" aria-hidden />
                  {b.name} · {formatMoney(b.amountCents, { trimZeroCents: true })}
                  {on && <CircleCheck className="size-4 text-primary" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}
        <Field
          label={t("move.note")}
          placeholder={t("move.notePlaceholder")}
          value={note}
          maxLength={140}
          onChange={(e) => setNote(e.target.value)}
          className="mt-4"
        />
        <div className="mt-4">
          <Keypad value={amount} onChange={(v) => { setAmount(v); setAmountError(null); }} maxCents={user.account.balanceCents} label={t("move.amountLabel")} />
        </div>
        <Button size="lg" className="mt-4" onClick={getQuote} loading={quoting} loadingText={t("move.gettingQuote")} disabled={cents === 0}>
          {t("move.review")}
        </Button>
      </div>
    );
  }

  if ((stage === "review" || stage === "sending") && quote && recipient) {
    const q = quote.quote;
    const sending = stage === "sending";
    return (
      <div className="space-y-5 pt-2">
        <div className="flex flex-col items-center text-center">
          <Avatar name={q.receiverName} size="lg" />
          <p className="mt-2 text-title font-semibold">{q.receiverName}</p>
          <p className="break-all text-caption text-muted-foreground">{q.receiver.url}</p>
        </div>
        <dl className="divide-y divide-border rounded-2xl border border-border bg-card">
          <Row label={t("move.youSend")} value={formatMoney(q.debitCents - q.feeCents)} />
          <Row label={t("move.fee")} value={formatMoney(q.feeCents)} />
          <Row label={t("move.totalCharged")} value={formatMoney(q.debitCents)} strong />
          {q.rate && <Row label={t("move.rate")} value={t("move.rateValue", { rate: `${q.rate} ${q.receive.currency}` })} />}
          <Row label={t("move.theyReceive", { name: q.receiverName.split(" (")[0] })} value={formatForeign(q.receive.value, q.receive.currency)} strong />
          <Row label={t("move.arrival")} value={t("move.arrivalSeconds")} />
          {billId && <Row label={t("move.paysBill")} value={user.bills.find((b) => b.id === billId)?.name ?? ""} />}
          {note.trim() && <Row label={t("move.note")} value={note.trim()} />}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="text-body text-muted-foreground">{t("move.via")}</dt>
            <dd>{q.mode === "interledger" ? <Badge tone="info">{t("move.viaInterledger")}</Badge> : <SimulatedBadge label={quote.fellBack ? t("move.viaFallback") : modes.payments === "interledger" ? t("move.viaPractice") : t("move.viaMock")} />}</dd>
          </div>
        </dl>
        <p className="text-center text-caption text-muted-foreground">{t("move.quoteExpires")}</p>

        {sendError && (
          <div role="alert" className="rounded-2xl border border-negative/30 bg-negative-soft p-4">
            <p className="flex items-start gap-2 text-body font-semibold text-negative">
              <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              {sendError}
            </p>
            <p className="mt-1 pl-7 text-body text-foreground/80">{t("move.errNetworkSub")}</p>
          </div>
        )}

        {sending ? (
          <SendingProgress reduced={reduced} />
        ) : (
          <div className="space-y-2">
            <Button size="lg" onClick={send}>
              {sendError ? t("move.retry") : t("move.sendCta", { amount: formatMoney(q.debitCents) })}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { setStage("amount"); setSendError(null); }}>
              {sendError ? t("move.cancelSend") : t("move.editAmount")}
            </Button>
          </div>
        )}

        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <PaymentTrace steps={quote.steps} />
        </div>
      </div>
    );
  }

  if (stage === "receipt" && result) {
    const tr = result.transfer;
    const share = async () => {
      const text = t("move.receiptShareText", { amount: formatMoney(tr.debit.value - tr.feeCents), name: tr.counterpartyName, id: tr.id.slice(0, 8).toUpperCase() });
      if (navigator.share) await navigator.share({ text }).catch(() => {});
      else {
        await navigator.clipboard.writeText(text);
        toast.success(t("app.copied"));
      }
    };
    return (
      <div className="space-y-5 pt-2">
        <div role="status" className="flex flex-col items-center text-center">
          <span className="flex size-16 animate-pop items-center justify-center rounded-full bg-positive-soft text-positive">
            <CircleCheck className="size-10" aria-hidden />
          </span>
          <h2 className="mt-3 font-display text-headline font-semibold">{t("move.receiptTitle")}</h2>
          <p className="text-body text-muted-foreground">{t("move.receiptSub", { name: tr.counterpartyName.split(" (")[0] })}</p>
          <p className="tnum mt-2 font-display text-display font-semibold">{formatForeign(tr.counterpart.value, tr.counterpart.currency)}</p>
          {result.paidBillId && <Badge tone="positive" className="mt-2">{t("budget.paid")} · {user.bills.find((b) => b.id === result.paidBillId)?.name}</Badge>}
        </div>
        <TransferDetails transfer={tr} fellBack={result.fellBack} />
        <div className="space-y-2">
          <Button size="lg" onClick={reset}>
            {t("move.sendAnother")}
          </Button>
          <Button variant="outline" className="w-full" onClick={share}>
            <Share2 className="size-4" aria-hidden />
            {t("move.shareReceipt")}
          </Button>
        </div>
        <p className="text-center text-caption text-muted-foreground">{formatDate(tr.createdAt)} · {tr.mode === "interledger" ? t("move.liveBadge") : t("app.simulated")}</p>
      </div>
    );
  }

  return null;
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-body text-muted-foreground">{label}</dt>
      <dd className={cn("tnum text-right text-body", strong && "font-semibold")}>{value}</dd>
    </div>
  );
}

function RecipientChip({ recipient, onChange }: { recipient: Recipient; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
      <Avatar name={recipient.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold">{t("move.amountTo", { name: recipient.name })}</p>
        <p className="truncate text-caption text-muted-foreground">
          {t("move.walletCurrency", { currency: recipient.assetCode })} · {recipient.wallet.replace(/^https:\/\//, "")}
        </p>
      </div>
      <Button variant="ghost" onClick={onChange}>
        {t("app.edit")}
      </Button>
    </div>
  );
}

function SendingProgress({ reduced }: { reduced: boolean }) {
  const labels = [t("move.sendingStep1"), t("move.sendingStep2"), t("move.sendingStep3")];
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setActive((a) => Math.min(a + 1, labels.length - 1)), 550);
    return () => window.clearInterval(id);
  }, [reduced, labels.length]);
  return (
    <div role="status" aria-live="polite" className="rounded-2xl bg-secondary/70 p-4">
      <p className="flex items-center gap-2 text-body font-semibold">
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
        {t("move.sending")}
      </p>
      <ol className="mt-2 space-y-1 pl-7">
        {labels.map((l, i) => (
          <li key={l} className={cn("text-body", i <= active ? "text-foreground" : "text-muted-foreground/70")}>
            {i < active ? "✓ " : ""}
            {l}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-caption text-muted-foreground">{t("move.sendingSub")}</p>
    </div>
  );
}

function RecipientStep({ onPick }: { onPick: (r: Recipient) => void }) {
  const { user } = useAppState();
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const lookup = async (raw: string) => {
    const value = raw.trim();
    if (!/^(https:\/\/|\$)[^\s/]+\.[^\s]+/i.test(value)) return setError(t("move.errInvalid"));
    setChecking(true);
    setError(null);
    try {
      const res = await api<{ wallet: { url: string; assetCode: string; publicName: string | null } }>(`/api/wallet/resolve?address=${encodeURIComponent(value)}`);
      if (res.wallet.url === user.profile.walletAddress) return setError(t("move.errSelf"));
      const known = user.contacts.find((c) => c.walletAddress === res.wallet.url);
      onPick({
        wallet: res.wallet.url,
        name: known?.name ?? res.wallet.publicName ?? nameFromWallet(res.wallet.url),
        assetCode: res.wallet.assetCode,
        contactId: known?.id,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("app.genericError"));
    } finally {
      setChecking(false);
    }
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddress(text.trim());
      setError(null);
    } catch {
      /* clipboard permission denied: the field still works */
    }
  };

  return (
    <div className="pt-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(address);
        }}
        noValidate
      >
        <Field
          label={t("move.recipientTitle")}
          placeholder={t("move.recipientPlaceholder")}
          hint={t("move.worksWith")}
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setError(null);
          }}
          error={error}
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant="secondary" onClick={paste}>
            <ClipboardPaste className="size-4" aria-hidden />
            {t("move.paste")}
          </Button>
          <Button variant="secondary" onClick={() => setScanOpen(true)}>
            <QrCode className="size-4" aria-hidden />
            {t("move.scan")}
          </Button>
          <Button type="submit" loading={checking} loadingText="…" disabled={!address.trim()}>
            {t("move.next")}
          </Button>
        </div>
      </form>

      <h2 className="mb-1 mt-6 text-body font-semibold">{t("move.people")}</h2>
      {user.contacts.length === 0 ? (
        <p className="text-body text-muted-foreground">{t("move.contactsEmpty")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {user.contacts.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick({ wallet: c.walletAddress, name: c.name, assetCode: c.assetCode, contactId: c.id })}
                className="flex min-h-16 w-full items-center gap-3 py-2 text-left"
              >
                <Avatar name={c.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">{c.name}</span>
                  <span className="block truncate text-caption text-muted-foreground">{c.relationship}</span>
                </span>
                {c.assetCode !== "USD" && (
                  <Badge tone="info" icon={<Globe className="size-3.5" aria-hidden />}>
                    {c.assetCode}
                  </Badge>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <ScanSheet
        open={scanOpen}
        onOpenChange={setScanOpen}
        onResult={(text) => {
          setScanOpen(false);
          const to = (() => {
            try {
              return new URL(text).searchParams.get("to") ?? text;
            } catch {
              return text;
            }
          })();
          setAddress(to);
          void lookup(to);
        }}
      />
    </div>
  );
}
