"use client";

import { useState } from "react";
import { Building2, CircleCheck, ExternalLink, Landmark, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Screen } from "@/components/shell/screen";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { SimulatedBadge } from "@/components/ui/badge";
import { AmountDisplay, amountToCents, Keypad, QuickChips } from "@/components/ui/keypad";
import { api, ApiClientError } from "@/lib/client/api";
import { useAppState } from "@/lib/client/hooks";
import { formatMoney, relativeDays } from "@/lib/format";
import { t } from "@/i18n";

const DEMO_BANKS = ["Demo Credit Union", "Demo National Bank", "Demo Community Bank"] as const;

/**
 * Add money / Cash out, designed the way the full product will work: link a
 * bank once (Plaid in production), then move money between the bank and the
 * Sprout wallet (ACH through the licensed wallet partner). Bank steps are a
 * simulated preview; wallet payments on Home and Send are real.
 */
export function BankTransfer({ direction }: { direction: "in" | "out" }) {
  const { user } = useAppState();
  const bank = user.bank;
  const adding = direction === "in";
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const link = async (institution: string) => {
    setBusy(true);
    try {
      await api("/api/bank", { method: "POST", body: { institution } });
      toast.success(t("bank.linked", { bank: institution }));
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    try {
      await api("/api/bank", { method: "DELETE" });
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const cents = amountToCents(value);
    if (cents < 100) return toast.error(t("bank.minAmount"));
    setBusy(true);
    try {
      await api("/api/bank", { method: "PATCH", body: { direction, amountCents: cents } });
      setDone(cents);
      setValue("");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={adding ? t("bank.title") : t("bank.cashOutTitle")} back="/home">
      <div className="mb-4 flex items-start gap-2 rounded-2xl bg-muted p-3 text-caption text-muted-foreground">
        <SimulatedBadge label={t("bank.previewBadge")} className="shrink-0" />
        <span>{t("bank.previewNote")}</span>
      </div>

      {done !== null ? (
        <Card className="p-5 text-center">
          <CircleCheck className="mx-auto size-10 text-positive" aria-hidden />
          <p className="mt-2 font-display text-title font-semibold">
            {adding ? t("bank.addStarted", { amount: formatMoney(done) }) : t("bank.cashOutStarted", { amount: formatMoney(done) })}
          </p>
          <p className="mt-1 text-body text-muted-foreground">{adding ? t("bank.addTiming") : t("bank.cashOutTiming")}</p>
          {adding && (
            <div className="mt-4 rounded-xl bg-muted p-3 text-left text-caption text-muted-foreground">
              {t("bank.testNetworkTip")}{" "}
              <a href="https://wallet.interledger-test.dev" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-primary underline underline-offset-2">
                {t("bank.openTestWallet")}
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </div>
          )}
          <div className="mt-4 space-y-2">
            <ButtonLink href="/home" size="lg">
              {t("bank.goHome")}
            </ButtonLink>
            <Button variant="ghost" className="w-full" onClick={() => setDone(null)}>
              {adding ? t("bank.addMore") : t("bank.cashOutMore")}
            </Button>
          </div>
        </Card>
      ) : !bank ? (
        <Card className="p-5">
          <Landmark className="size-8 text-primary" aria-hidden />
          <h2 className="mt-2 font-display text-title font-semibold">{t("bank.linkTitle")}</h2>
          <p className="mt-1 text-body text-muted-foreground">{t("bank.linkBody")}</p>
          <ul className="mt-4 space-y-2" aria-label={t("bank.pickBank")}>
            {DEMO_BANKS.map((b) => (
              <li key={b}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => link(b)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border px-3 text-left text-body font-medium hover:bg-muted disabled:opacity-60"
                >
                  <Building2 className="size-5 text-primary" aria-hidden />
                  {b}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-1.5 text-caption text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            {t("bank.plaidNote")}
          </p>
        </Card>
      ) : (
        <>
          <Card className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Landmark className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-semibold">{bank.institution}</span>
              <span className="block text-caption text-muted-foreground">
                {bank.accountName} ••{bank.mask}
              </span>
            </span>
            <Button variant="ghost" onClick={unlink} disabled={busy}>
              {t("bank.unlink")}
            </Button>
          </Card>
          <div className="mt-4">
            <AmountDisplay value={value} label={adding ? t("bank.amountIn") : t("bank.amountOut")} sub={adding ? t("bank.fromBank", { bank: bank.institution }) : t("bank.toBank", { bank: bank.institution })} />
            <QuickChips amounts={[20, 50, 100]} onPick={(n) => setValue(String(n))} />
            <Keypad value={value} onChange={setValue} maxCents={500_000} label={adding ? t("bank.amountIn") : t("bank.amountOut")} />
            <Button size="lg" className="mt-3" onClick={submit} loading={busy} disabled={amountToCents(value) < 100}>
              {adding ? t("bank.addCta", { amount: formatMoney(amountToCents(value)) }) : t("bank.cashOutCta", { amount: formatMoney(amountToCents(value)) })}
            </Button>
          </div>
          {bank.transfers.length > 0 && (
            <section className="mt-6" aria-labelledby="bank-history">
              <h2 id="bank-history" className="mb-1 text-body font-semibold">
                {t("bank.history")}
              </h2>
              <ul className="divide-y divide-border/70">
                {bank.transfers.slice(0, 5).map((tr) => (
                  <li key={tr.id} className="flex items-center justify-between gap-3 py-2.5 text-body">
                    <span>
                      {tr.direction === "in" ? t("bank.historyIn") : t("bank.historyOut")}
                      <span className="block text-caption text-muted-foreground">
                        {relativeDays(tr.at)} · {t("bank.simulated")}
                      </span>
                    </span>
                    <span className="tnum font-semibold">{formatMoney(tr.amountCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Screen>
  );
}
