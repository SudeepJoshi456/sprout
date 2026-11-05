"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { CircleCheck, Copy, Link2, Share2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { AmountDisplay, amountToCents, Keypad, QuickChips } from "@/components/ui/keypad";
import { TransferRow } from "@/components/money/rows";
import { api, ApiClientError } from "@/lib/client/api";
import { useAppState } from "@/lib/client/hooks";
import { formatDate, formatMoney } from "@/lib/format";
import type { PaymentRequest } from "@/lib/types";
import { t } from "@/i18n";

function useQr(text: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    let live = true;
    QRCode.toDataURL(text, { margin: 1, width: 480, errorCorrectionLevel: "M", color: { dark: "#141a17", light: "#ffffff" } }).then((url) => {
      if (live) setSrc(url);
    });
    return () => {
      live = false;
    };
  }, [text]);
  return src;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(t("app.copied"));
  } catch {
    toast(text);
  }
}

async function share(text: string, url?: string) {
  if (navigator.share) await navigator.share({ text, url }).catch(() => {});
  else await copy(url ?? text);
}

function QrCard({ value, alt }: { value: string; alt: string }) {
  const src = useQr(value);
  return (
    <div className="mx-auto w-fit rounded-3xl border border-border bg-white p-3 shadow-card">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimize
        <img src={src} alt={alt} width={220} height={220} className="size-[220px]" />
      ) : (
        <div className="size-[220px] animate-pulse rounded-xl bg-muted" aria-hidden />
      )}
    </div>
  );
}

function ListeningPill({ live }: { live: boolean }) {
  return (
    <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-caption font-medium text-muted-foreground">
      <span className="relative flex size-2" aria-hidden>
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60 motion-reduce:hidden" />}
        <span className={`relative inline-flex size-2 rounded-full ${live ? "bg-positive" : "bg-muted-foreground"}`} />
      </span>
      {live ? t("move.listening") : t("move.listeningSim")}
    </p>
  );
}

export function ReceivePanel() {
  const { user, modes } = useAppState();
  const live = modes.receiving === "interledger";
  const wallet = user.profile.walletAddress;
  if (!wallet) {
    return (
      <div className="py-10 text-center">
        <p className="text-body text-muted-foreground">{t("move.noWallet")}</p>
        <ButtonLink href="/profile" className="mt-3">
          {t("move.connectWallet")}
        </ButtonLink>
      </div>
    );
  }
  const incoming = user.transfers.filter((tr) => tr.direction === "in");
  return (
    <div className="space-y-5 pt-2">
      <div className="text-center">
        <h2 className="font-display text-title font-semibold">{t("move.receiveTitle")}</h2>
        <p className="text-body text-muted-foreground">{t("move.receiveSub")}</p>
        <ListeningPill live={live} />
      </div>
      <QrCard value={wallet} alt={t("move.qrAlt")} />
      <p className="break-all rounded-xl bg-muted px-3 py-2 text-center font-mono text-body">{wallet}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => copy(wallet)}>
          <Copy className="size-4" aria-hidden />
          {t("move.copyAddress")}
        </Button>
        <Button variant="secondary" onClick={() => share(wallet)}>
          <Share2 className="size-4" aria-hidden />
          {t("app.share")}
        </Button>
      </div>
      <p className="text-center text-caption text-muted-foreground">{t("move.worksWith")}</p>
      {incoming.length > 0 && (
        <section>
          <h3 className="mb-1 text-body font-semibold">{t("move.received")}</h3>
          <div className="divide-y divide-border">
            {incoming.slice(0, 5).map((tr) => (
              <TransferRow key={tr.id} transfer={tr} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RequestStatus({ request }: { request: PaymentRequest }) {
  const received = request.receivedCents ?? 0;
  const label = request.paidAt
    ? t("move.requestPaid")
    : received > 0
      ? t("move.requestPartial", { received: formatMoney(received), amount: formatMoney(request.amountCents) })
      : t("move.requestWaiting");
  return (
    <p role="status" className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold ${request.paidAt ? "bg-positive-soft text-positive" : "bg-muted text-muted-foreground"}`}>
      {request.paidAt && <CircleCheck className="size-3.5" aria-hidden />}
      {label}
    </p>
  );
}

export function RequestPanel() {
  const { user } = useAppState();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<PaymentRequest | null>(null);

  const create = async () => {
    const cents = amountToCents(amount);
    if (cents < 100) return setError(t("move.amountMin"));
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ request: PaymentRequest }>("/api/payments/request", { method: "POST", body: { amountCents: cents, note: note.trim() } });
      setCreated(res.request);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    const text = t("move.requestShareText", { amount: formatMoney(created.amountCents) });
    const current = user.requests.find((r) => r.id === created.id) ?? created;
    return (
      <div className="space-y-5 pt-2 text-center">
        <div>
          <h2 className="font-display text-title font-semibold">{t("move.requestReady")}</h2>
          <p className="tnum text-headline font-semibold">{formatMoney(created.amountCents)}</p>
          {created.note && <p className="text-body text-muted-foreground">{created.note}</p>}
          {current.incomingPaymentUrl && <RequestStatus request={current} />}
        </div>
        {current.incomingPaymentUrl && (
          <div className="rounded-2xl border border-border bg-card p-4 text-left">
            <p className="text-body font-semibold">{t("move.requestLive")}</p>
            <p className="mt-1 text-caption text-muted-foreground">{t("move.requestLiveBody")}</p>
            <p className="mt-2 text-caption font-medium">{t("move.requestOpLink")}</p>
            <p className="mt-1 break-all rounded-lg bg-muted px-2 py-1.5 font-mono text-caption">{current.incomingPaymentUrl}</p>
            <Button variant="secondary" className="mt-2 w-full" onClick={() => copy(current.incomingPaymentUrl!)}>
              <Copy className="size-4" aria-hidden />
              {t("move.copyOpLink")}
            </Button>
          </div>
        )}
        <QrCard value={created.url} alt={t("move.qrAlt")} />
        <p className="break-all rounded-xl bg-muted px-3 py-2 font-mono text-caption">{created.url}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => copy(created.url)}>
            <Link2 className="size-4" aria-hidden />
            {t("move.copyLink")}
          </Button>
          <Button variant="secondary" onClick={() => share(text, created.url)}>
            <Share2 className="size-4" aria-hidden />
            {t("move.shareLink")}
          </Button>
        </div>
        <Button variant="ghost" className="w-full" onClick={() => { setCreated(null); setAmount(""); setNote(""); }}>
          {t("move.requestAnother")}
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="text-center">
        <h2 className="font-display text-title font-semibold">{t("move.requestTitle")}</h2>
        <p className="text-body text-muted-foreground">{t("move.requestSub")}</p>
      </div>
      <AmountDisplay value={amount} label={t("move.requestAmount")} />
      {error && (
        <p role="alert" className="mb-3 text-center text-body font-medium text-negative">
          {error}
        </p>
      )}
      <QuickChips amounts={[10, 20, 50]} onPick={(n) => setAmount(String(n))} />
      <Field label={t("move.requestNote")} value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} className="mt-4" />
      <div className="mt-4">
        <Keypad value={amount} onChange={(v) => { setAmount(v); setError(null); }} maxCents={1_000_000} label={t("move.requestAmount")} />
      </div>
      <Button size="lg" className="mt-4" onClick={create} loading={busy} disabled={amountToCents(amount) === 0}>
        {t("move.requestCta")}
      </Button>
      {user.requests.length > 0 && (
        <ul className="mt-6 divide-y divide-border">
          {user.requests.slice(0, 3).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="tnum block text-body font-medium">{formatMoney(r.amountCents)}</span>
                <span className="block truncate text-caption text-muted-foreground">
                  {r.paidAt ? `${t("move.requestPaid")} · ` : r.incomingPaymentUrl ? `${t("move.requestWaiting")} · ` : ""}
                  {r.note || formatDate(r.createdAt)}
                </span>
              </span>
              <Button variant="ghost" onClick={() => copy(r.url)}>
                <Copy className="size-4" aria-hidden />
                {t("move.copyLink")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
