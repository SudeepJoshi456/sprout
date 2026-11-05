"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { BadgeCheck, Copy, CreditCard, GraduationCap, Landmark, LogOut, PiggyBank, RotateCcw, TrendingUp, UserRound, Wallet } from "lucide-react";
import { Screen } from "@/components/shell/screen";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, SimulatedBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Sheet } from "@/components/ui/sheet";
import { Field } from "@/components/ui/field";
import { api, ApiClientError, clearSnapshot, resetDemo } from "@/lib/client/api";
import { useAppState } from "@/lib/client/hooks";
import { CURRENCY_NAMES } from "@/data/fx";
import type { PersonaId, Settings } from "@/lib/types";
import { t } from "@/i18n";

type Theme = "system" | "light" | "dark";

/** Profile & settings: identity, linked wallet, preferences, and account tools. */
export default function ProfilePage() {
  const { user, persona, modes } = useAppState();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [walletOpen, setWalletOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const p = user.profile;
  const live = modes.payments === "interledger";

  const patch = async (body: Record<string, unknown>) => {
    try {
      await api("/api/profile", { method: "PATCH", body });
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    }
  };
  const setNotif = (key: keyof Settings["notifications"], value: boolean) => patch({ notifications: { [key]: value } });

  const switchTo = async (next: PersonaId) => {
    if (next === persona) return;
    setBusy(true);
    try {
      await api("/api/persona", { method: "POST", body: { persona: next } });
      toast.success(t("profile.switched", { name: next === "sudeep" ? "Sudeep" : "Marcus" }));
      router.push("/home");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (then: "/" | "/onboarding") => {
    setBusy(true);
    try {
      await resetDemo("sudeep");
      toast.success(t("profile.resetDone"));
      router.push(then);
    } finally {
      setBusy(false);
      setResetOpen(false);
    }
  };

  const signOut = () => {
    clearSnapshot();
    localStorage.removeItem("sprout.sid");
    router.push("/");
    setTimeout(() => window.location.reload(), 50);
  };

  const idLabel = p.idType === "passport" ? t("onboarding.identity.passport") : p.idType === "itin" ? t("onboarding.identity.itin") : p.idType === "ssn" ? t("onboarding.identity.ssn") : null;

  return (
    <Screen title={t("profile.title")} back="/home">
      <div className="space-y-5 pt-2">
        <Card className="flex items-center gap-4 p-5">
          <Avatar name={p.fullName} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-title font-semibold">{p.fullName}</h2>
            {p.verified && idLabel ? (
              <p className="mt-0.5 flex items-center gap-1 text-caption font-semibold text-positive">
                <BadgeCheck className="size-4" aria-hidden />
                {t("profile.verifiedWith", { id: idLabel })}
              </p>
            ) : (
              <p className="mt-0.5 text-caption text-muted-foreground">{t("profile.notVerified")}</p>
            )}
            {p.bio && <p className="mt-1 text-caption text-muted-foreground">{p.bio}</p>}
          </div>
        </Card>

        <Card aria-labelledby="pf-wallet">
          <CardHeader
            id="pf-wallet"
            title={
              <span className="flex items-center gap-2">
                <Wallet className="size-4 text-primary" aria-hidden />
                {t("profile.wallet")}
              </span>
            }
            action={live && p.walletAddress ? <Badge tone="info">{t("move.liveBadge")}</Badge> : <SimulatedBadge />}
          />
          {p.walletAddress ? (
            <p className="break-all rounded-xl bg-muted px-3 py-2 font-mono text-caption">{p.walletAddress}</p>
          ) : (
            <p className="text-body text-muted-foreground">{t("profile.walletNone")}</p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {p.walletAddress && (
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(p.walletAddress!).catch(() => {});
                  toast.success(t("app.copied"));
                }}
              >
                <Copy className="size-4" aria-hidden />
                {t("app.copy")}
              </Button>
            )}
            <Button variant="outline" className={p.walletAddress ? "" : "col-span-2"} onClick={() => setWalletOpen(true)}>
              {t("profile.walletEdit")}
            </Button>
          </div>
        </Card>

        <Card aria-labelledby="pf-bank">
          <CardHeader
            id="pf-bank"
            title={
              <span className="flex items-center gap-2">
                <Landmark className="size-4 text-primary" aria-hidden />
                {t("profile.bankTitle")}
              </span>
            }
            action={<SimulatedBadge />}
          />
          <dl className="mb-3 divide-y divide-border">
            <Row label={t("profile.accountTitle")} value={user.account.lastFour ? `${user.account.name} ••${user.account.lastFour}` : t("profile.accountNotOpen")} />
            {user.linkedBank && <Row label={user.linkedBank.institution} value={`${user.linkedBank.accountName} ••${user.linkedBank.mask}`} />}
          </dl>
          {!user.linkedBank && <p className="mb-3 text-body text-muted-foreground">{t("profile.bankNone")}</p>}
          <div className="grid grid-cols-2 gap-2">
            <ButtonLink href="/add-money" variant="secondary" className={user.linkedBank ? "" : "col-span-2"}>
              {user.linkedBank ? t("bank.ctaDeposit") : t("profile.bankConnect")}
            </ButtonLink>
            {user.linkedBank && (
              <Button
                variant="outline"
                onClick={async () => {
                  await api("/api/bank/link", { method: "DELETE" });
                  toast.success(t("profile.bankUnlinked"));
                }}
              >
                {t("profile.bankUnlink")}
              </Button>
            )}
          </div>
        </Card>

        <Card aria-labelledby="pf-identity">
          <CardHeader id="pf-identity" title={t("profile.identity")} />
          <dl className="divide-y divide-border">
            <Row label={t("profile.idType")} value={idLabel ?? "Not added"} />
            <Row label={t("profile.idNumber")} value={p.idMasked ?? "Not added"} />
            {p.idType === "passport" && p.idCountry && <Row label={t("onboarding.identity.country")} value={p.idCountry} />}
            {p.visaType && <Row label={t("profile.visa")} value={p.visaType} />}
            {p.schoolEmail && <Row label={t("profile.school")} value={p.schoolEmail} />}
          </dl>
        </Card>

        <section aria-labelledby="pf-prefs" className="space-y-3">
          <SectionTitle id="pf-prefs">{t("profile.appearance")}</SectionTitle>
          <Segmented<Theme>
            label={t("profile.appearance")}
            role="radiogroup"
            value={(theme as Theme) ?? "system"}
            onChange={setTheme}
            options={[
              { value: "system", label: t("profile.themeSystem") },
              { value: "light", label: t("profile.themeLight") },
              { value: "dark", label: t("profile.themeDark") },
            ]}
          />
          {p.homeCurrency && (
            <Card className="py-2">
              <Switch
                checked={user.settings.showHomeCurrency}
                onChange={(v) => patch({ showHomeCurrency: v })}
                label={t("profile.showHome", { currency: p.homeCurrency })}
                hint={t("profile.showHomeHint", { currency: CURRENCY_NAMES[p.homeCurrency] ?? p.homeCurrency })}
              />
            </Card>
          )}
        </section>

        <section aria-labelledby="pf-notif">
          <SectionTitle id="pf-notif">{t("profile.notifications")}</SectionTitle>
          <Card className="divide-y divide-border py-1">
            <Switch checked={user.settings.notifications.transfers} onChange={(v) => setNotif("transfers", v)} label={t("profile.nTransfers")} />
            <Switch checked={user.settings.notifications.bills} onChange={(v) => setNotif("bills", v)} label={t("profile.nBills")} />
            <Switch checked={user.settings.notifications.coach} onChange={(v) => setNotif("coach", v)} label={t("profile.nCoach")} />
            <Switch checked={user.settings.notifications.learning} onChange={(v) => setNotif("learning", v)} label={t("profile.nLearning")} />
          </Card>
        </section>

        <section aria-labelledby="pf-soon">
          <SectionTitle id="pf-soon">{t("profile.comingSoon")}</SectionTitle>
          <Card className="divide-y divide-border py-1">
            <Soon icon={<PiggyBank className="size-5" aria-hidden />} label={t("profile.savings")} />
            <Soon icon={<CreditCard className="size-5" aria-hidden />} label={t("profile.credit")} />
            <Soon icon={<TrendingUp className="size-5" aria-hidden />} label={t("profile.brokerage")} />
          </Card>
        </section>

        <Card aria-labelledby="pf-about">
          <CardHeader id="pf-about" title={t("profile.aboutTitle")} />
          <dl className="mb-3 divide-y divide-border">
            <Row label={t("profile.modePayments")} value={live ? t("profile.modeLive") : t("profile.modeSimulated")} />
            <Row label={t("profile.modeAi")} value={modes.ai === "live" ? "AI" : t("profile.modeSimulated")} />
            <Row label={t("profile.modeMarket")} value={modes.market === "live" ? t("move.liveBadge") : t("grow.snapshotNote")} />
          </dl>
          <p className="text-caption text-muted-foreground">{t("profile.aboutPrototype")}</p>
          <p className="mt-2 text-caption text-muted-foreground">{t("profile.aboutBody")}</p>
        </Card>

        <section aria-labelledby="pf-acct" className="space-y-3">
          <SectionTitle id="pf-acct">{t("profile.demo")}</SectionTitle>
          <Card className="space-y-3">
            <p className="text-body font-semibold">{t("profile.persona")}</p>
            <div className="grid grid-cols-2 gap-2">
              {(["sudeep", "marcus"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  aria-pressed={persona === id}
                  onClick={() => switchTo(id)}
                  className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 text-left text-body font-semibold transition-colors ${persona === id ? "border-primary bg-positive-soft text-primary" : "border-input bg-card hover:bg-muted"}`}
                >
                  {id === "sudeep" ? <UserRound className="size-4" aria-hidden /> : <GraduationCap className="size-4" aria-hidden />}
                  {id === "sudeep" ? "Sudeep Joshi" : "Marcus Johnson"}
                </button>
              ))}
            </div>
            {!live && (
              <div className="border-t border-border pt-2">
                <Switch checked={user.demo.failNextSend} onChange={(v) => api("/api/demo/flags", { method: "PATCH", body: { failNextSend: v } })} label={t("profile.failNext")} hint={t("profile.failNextHint")} />
              </div>
            )}
          </Card>
          <Button variant="outline" className="w-full" disabled={busy} onClick={() => reset("/onboarding")}>
            {t("profile.replayOnboarding")}
          </Button>
          <Button variant="outline" className="w-full" disabled={busy} onClick={() => setResetOpen(true)}>
            <RotateCcw className="size-4" aria-hidden />
            {t("profile.reset")}
          </Button>
          <Button variant="ghost" className="w-full text-negative" onClick={signOut}>
            <LogOut className="size-4" aria-hidden />
            {t("profile.signOut")}
          </Button>
        </section>
      </div>

      <WalletSheet open={walletOpen} onOpenChange={setWalletOpen} current={p.walletAddress} />

      <Sheet open={resetOpen} onOpenChange={setResetOpen} title={t("profile.resetConfirmTitle")}>
        <p className="text-body text-muted-foreground">{t("profile.resetConfirmBody")}</p>
        <Button variant="danger" size="lg" className="mt-4" loading={busy} onClick={() => reset("/")}>
          {t("profile.reset")}
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setResetOpen(false)}>
          {t("app.cancel")}
        </Button>
      </Sheet>
    </Screen>
  );
}

function WalletSheet({ open, onOpenChange, current }: { open: boolean; onOpenChange: (o: boolean) => void; current: string | null }) {
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (address: string | null) => {
    setBusy(true);
    setError(null);
    try {
      if (address) await api(`/api/wallet/resolve?address=${encodeURIComponent(address)}`);
      await api("/api/profile", { method: "PATCH", body: { walletAddress: address } });
      toast.success(t("profile.walletSaved"));
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("profile.walletEdit")}>
      <Field
        label={t("profile.walletLabel")}
        hint={t("profile.walletHint")}
        error={error}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="https://ilp.interledger-test.dev/your-name"
      />
      <Button size="lg" className="mt-4" loading={busy} disabled={!value.trim()} onClick={() => save(value.trim())}>
        {t("profile.walletSave")}
      </Button>
      {current && (
        <Button variant="ghost" className="mt-2 w-full" disabled={busy} onClick={() => save(null)}>
          {t("profile.walletRemove")}
        </Button>
      )}
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-body text-muted-foreground">{label}</dt>
      <dd className="text-right text-body font-medium">{value}</dd>
    </div>
  );
}

function Soon({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-14 items-center gap-3 py-2">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</span>
      <span className="flex-1 text-body font-medium">{label}</span>
      <Badge>{t("profile.comingSoon")}</Badge>
    </div>
  );
}
