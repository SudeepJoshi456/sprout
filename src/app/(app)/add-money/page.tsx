"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleCheck, Landmark, Lock, PartyPopper } from "lucide-react";
import { Screen } from "@/components/shell/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { SimulatedBadge } from "@/components/ui/badge";
import { AmountDisplay, Keypad, QuickChips, amountToCents } from "@/components/ui/keypad";
import { DEMO_BANKS, MAX_DEPOSIT_CENTS, type DemoBank } from "@/data/banks";
import { api, ApiClientError } from "@/lib/client/api";
import { useAppState } from "@/lib/client/hooks";
import { formatMoney } from "@/lib/format";
import { t } from "@/i18n";

type Stage = "banks" | "signin" | "account" | "amount" | "done";

/** ★ Add money: connect a bank (simulated), then deposit. The first deposit opens the account. */
export default function AddMoneyPage() {
  const { user } = useAppState();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(user.linkedBank ? "amount" : "banks");
  const [bank, setBank] = useState<DemoBank | null>(null);
  const [mask, setMask] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ amountCents: number; opened: boolean; lastFour: string | null } | null>(null);

  const fail = (e: unknown) => toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));

  const connect = async () => {
    if (!bank || !mask) return;
    setBusy(true);
    try {
      await api("/api/bank/link", { method: "POST", body: { institutionId: bank.id, mask } });
      toast.success(t("bank.connected", { bank: bank.name }));
      setStage("amount");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const deposit = async () => {
    setBusy(true);
    try {
      const res = await api<{ deposit: { amountCents: number; opened: boolean; lastFour: string | null } }>("/api/bank/deposit", {
        method: "POST",
        body: { amountCents: amountToCents(amount) },
      });
      setResult(res.deposit);
      setStage("done");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const back = stage === "signin" ? () => setStage("banks") : stage === "account" ? () => setStage("signin") : "/home";

  return (
    <Screen title={t("bank.title")} back={back} actions={<SimulatedBadge />}>
      {stage === "banks" && (
        <div className="space-y-4 pt-2">
          <div>
            <h2 className="font-display text-title font-semibold">{t("bank.connectTitle")}</h2>
            <p className="mt-1 text-body text-muted-foreground">{t("bank.connectBody")}</p>
          </div>
          <ul aria-label={t("bank.searchLabel")} className="grid grid-cols-2 gap-2">
            {DEMO_BANKS.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => {
                    setBank(b);
                    setMask(b.accounts[0].mask);
                    setStage("signin");
                  }}
                  className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left text-body font-semibold hover:border-primary"
                >
                  <BankBadge bank={b} />
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stage === "signin" && bank && (
        <form
          className="space-y-4 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            setStage("account");
          }}
        >
          <div className="flex items-center gap-3">
            <BankBadge bank={bank} />
            <h2 className="font-display text-title font-semibold">{t("bank.signInTitle", { bank: bank.name })}</h2>
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-body">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("bank.demoNotice")}
          </p>
          <Field label={t("bank.username")} defaultValue="sprout_demo" autoComplete="off" readOnly />
          <Field label={t("bank.password")} type="password" defaultValue="demo-password" autoComplete="off" readOnly />
          <Button type="submit" size="lg">
            {t("bank.signIn")}
          </Button>
        </form>
      )}

      {stage === "account" && bank && (
        <div className="space-y-4 pt-2">
          <div>
            <h2 className="font-display text-title font-semibold">{t("bank.chooseTitle")}</h2>
            <p className="mt-1 text-body text-muted-foreground">{t("bank.chooseBody")}</p>
          </div>
          <div role="radiogroup" aria-label={t("bank.chooseTitle")} className="space-y-2">
            {bank.accounts.map((a) => (
              <ChoiceCard
                key={a.mask}
                type="radio"
                name="bank-account"
                checked={mask === a.mask}
                onChange={() => setMask(a.mask)}
                title={`${a.name} ••${a.mask}`}
                hint={formatMoney(a.balanceCents)}
                icon={<Landmark className="size-5" aria-hidden />}
              />
            ))}
          </div>
          <Button size="lg" loading={busy} onClick={connect}>
            {t("bank.connect")}
          </Button>
        </div>
      )}

      {stage === "amount" && user.linkedBank && (
        <div className="flex min-h-full flex-col pt-2">
          <Card className="flex items-center gap-3 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Landmark className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-caption text-muted-foreground">{t("bank.from")}</span>
              <span className="block truncate text-body font-semibold">
                {user.linkedBank.institution} · {user.linkedBank.accountName} ••{user.linkedBank.mask}
              </span>
            </span>
            <button type="button" onClick={() => setStage("banks")} className="min-h-11 px-2 text-body font-semibold text-primary">
              {t("bank.change")}
            </button>
          </Card>
          <AmountDisplay value={amount} label={t("bank.amountLabel")} sub={t("bank.limit", { amount: formatMoney(MAX_DEPOSIT_CENTS, { trimZeroCents: true }) })} />
          <QuickChips amounts={[50, 100, 250, 500]} onPick={(n) => setAmount(String(n))} />
          <div className="mt-4">
            <Keypad value={amount} onChange={setAmount} maxCents={MAX_DEPOSIT_CENTS} label={t("bank.amountLabel")} />
          </div>
          <p className="mt-3 text-center text-caption text-muted-foreground">{t("bank.timing")}</p>
          <Button size="lg" className="mt-3" loading={busy} loadingText={t("bank.adding")} disabled={amountToCents(amount) === 0} onClick={deposit}>
            {t("bank.add", { amount: formatMoney(amountToCents(amount)) })}
          </Button>
        </div>
      )}

      {stage === "done" && result && (
        <div className="flex flex-col items-center pt-10 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-positive-soft text-positive">
            <CircleCheck className="size-9" aria-hidden />
          </span>
          <h2 role="status" className="mt-4 font-display text-headline font-semibold">
            {t("bank.doneTitle", { amount: formatMoney(result.amountCents) })}
          </h2>
          <p className="mt-1 text-body text-muted-foreground">{t("bank.doneBody")}</p>
          {result.opened && result.lastFour && (
            <Card className="mt-6 flex w-full items-start gap-3 text-left">
              <PartyPopper className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-body font-semibold">{t("bank.openedTitle")}</p>
                <p className="text-body text-muted-foreground">{t("bank.openedBody", { lastFour: result.lastFour })}</p>
              </div>
            </Card>
          )}
          <div className="mt-6 w-full space-y-2">
            <Button size="lg" onClick={() => router.push("/home")}>
              {t("bank.goHome")}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => router.push("/move")}>
              {t("bank.sendNow")}
            </Button>
          </div>
        </div>
      )}
    </Screen>
  );
}

function BankBadge({ bank }: { bank: DemoBank }) {
  const initials = bank.name.replace(/[^A-Za-z ]/g, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2);
  return (
    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl text-caption font-bold text-white" style={{ backgroundColor: bank.color }}>
      {initials}
    </span>
  );
}
