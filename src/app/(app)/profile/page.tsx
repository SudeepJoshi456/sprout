"use client";

import { Suspense, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { BadgeCheck, Copy, CreditCard, LogOut, PiggyBank, Trash2, TrendingUp, Unplug, Wallet } from "lucide-react";
import { Screen } from "@/components/shell/screen";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, SimulatedBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Sheet } from "@/components/ui/sheet";
import { Field } from "@/components/ui/field";
import { ConnectWallet, WalletReturnNotice } from "@/components/money/connect-wallet";
import { amountIn } from "@/components/money/wallet-activity";
import { api, ApiClientError, clearClient, invalidate } from "@/lib/client/api";
import { useAppState } from "@/lib/client/hooks";
import { CURRENCY_NAMES } from "@/data/fx";
import type { Settings } from "@/lib/types";
import { t } from "@/i18n";

type Theme = "system" | "light" | "dark";

const DEMO_TOOLS_KEY = "sprout.demoTools";

/** Profile & settings: identity, connected wallet, preferences, and account security. */
export default function ProfilePage() {
  const { user, email, handle, modes, wallet } = useAppState();
  const { theme, setTheme } = useTheme();
  const [walletOpen, setWalletOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoTools, setDemoTools] = useState(
    () => typeof window !== "undefined" && (localStorage.getItem(DEMO_TOOLS_KEY) === "1" || new URLSearchParams(window.location.search).get("demo") === "1"),
  );
  const taps = useRef(0);
  const p = user.profile;
  const live = modes.payments === "interledger";

  const toggleDemoTools = (on: boolean) => {
    setDemoTools(on);
    if (on) localStorage.setItem(DEMO_TOOLS_KEY, "1");
    else localStorage.removeItem(DEMO_TOOLS_KEY);
    if (on) toast(t("profile.demoShown"));
  };
  const tapVersion = () => {
    taps.current += 1;
    if (taps.current >= 5 && !demoTools) toggleDemoTools(true);
  };

  const patch = async (body: Record<string, unknown>) => {
    try {
      await api("/api/profile", { method: "PATCH", body });
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    }
  };
  const setNotif = (key: keyof Settings["notifications"], value: boolean) => patch({ notifications: { [key]: value } });

  const disconnect = async () => {
    setBusy(true);
    try {
      await api("/api/wallet/connect", { method: "DELETE" });
      invalidate("/api/wallet");
      toast.success(t("wallet.disconnected"));
      setDisconnectOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    clearClient();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload drops everything held in memory for the old session
    window.location.assign("/");
  };

  const idLabel = p.idType === "passport" ? t("onboarding.identity.passport") : p.idType === "itin" ? t("onboarding.identity.itin") : p.idType === "ssn" ? t("onboarding.identity.ssn") : null;

  return (
    <Screen title={t("profile.title")} back="/home">
      <Suspense>
        <WalletReturnNotice />
      </Suspense>
      <div className="space-y-5 pt-2">
        <Card className="flex items-center gap-4 p-5">
          <Avatar name={p.fullName} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-title font-semibold">{p.fullName}</h2>
            <p className="truncate text-caption text-muted-foreground">{email}</p>
            {p.verified && idLabel ? (
              <p className="mt-0.5 flex items-center gap-1 text-caption font-semibold text-positive">
                <BadgeCheck className="size-4" aria-hidden />
                {t("profile.verifiedWith", { id: idLabel })}
              </p>
            ) : (
              <p className="mt-0.5 text-caption text-muted-foreground">{t("profile.notVerified")}</p>
            )}
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
            action={live ? undefined : <SimulatedBadge />}
          />
          {handle && <p className="font-display text-title font-semibold">@{handle}</p>}
          {live && wallet ? (
            <div className="space-y-2">
              <p className="break-all rounded-xl bg-muted px-3 py-2 font-mono text-caption">{wallet.url}</p>
              <p className="text-caption text-muted-foreground">{t("wallet.cap", { amount: amountIn(wallet.capMinor, wallet.assetCode) })}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(wallet.url).catch(() => {});
                    toast.success(t("app.copied"));
                  }}
                >
                  <Copy className="size-4" aria-hidden />
                  {t("app.copy")}
                </Button>
                <Button variant="outline" onClick={() => setDisconnectOpen(true)}>
                  <Unplug className="size-4" aria-hidden />
                  {t("wallet.disconnect")}
                </Button>
              </div>
            </div>
          ) : live ? (
            <>
              <p className="mb-4 text-body text-muted-foreground">{t("wallet.connectBody")}</p>
              <ConnectWallet returnTo="/profile" />
            </>
          ) : (
            <>
              <p className="text-body text-muted-foreground">{t("wallet.notLive")}</p>
              {p.walletAddress && <p className="mt-2 break-all rounded-xl bg-muted px-3 py-2 font-mono text-caption">{p.walletAddress}</p>}
              <Button variant="outline" className="mt-3 w-full" onClick={() => setWalletOpen(true)}>
                {t("profile.walletEdit")}
              </Button>
            </>
          )}
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
          <p className="text-body">{t("app.mission")}</p>
          <p className="mt-2 text-caption text-muted-foreground">{t("profile.aboutPrototype")}</p>
          <p className="mt-2 text-caption text-muted-foreground">{t("profile.aboutBody")}</p>
          {/* Tapping the version 5 times reveals the demo tools (presenters only). */}
          <button type="button" onClick={tapVersion} className="mt-2 min-h-8 text-caption text-muted-foreground">
            {t("profile.version")}
          </button>
        </Card>

        <section aria-labelledby="pf-account" className="space-y-2">
          <SectionTitle id="pf-account">{t("profile.accountSecurity")}</SectionTitle>
          <Button variant="outline" className="w-full" disabled={busy} onClick={signOut}>
            <LogOut className="size-4" aria-hidden />
            {t("profile.signOut")}
          </Button>
          <Button variant="ghost" className="w-full text-negative" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" aria-hidden />
            {t("profile.deleteAccount")}
          </Button>
        </section>

        {demoTools && (
          <section aria-labelledby="pf-demo" className="space-y-3 rounded-2xl border border-dashed border-input p-3">
            <div className="flex items-center justify-between gap-2">
              <SectionTitle id="pf-demo">{t("profile.demo")}</SectionTitle>
              <Button variant="ghost" onClick={() => toggleDemoTools(false)}>
                {t("profile.demoHide")}
              </Button>
            </div>
            <p className="text-caption text-muted-foreground">{t("profile.demoBody")}</p>
            <dl className="divide-y divide-border rounded-xl bg-card px-3">
              <Row label={t("profile.modePayments")} value={live ? t("profile.modeLive") : t("profile.modeSimulated")} />
              <Row label={t("profile.modeAi")} value={modes.ai === "live" ? "AI" : t("profile.modeSimulated")} />
              <Row label={t("profile.modeMarket")} value={modes.market === "live" ? t("move.liveBadge") : t("grow.snapshotNote")} />
            </dl>
            {!live && (
              <Card>
                <Switch checked={user.demo.failNextSend} onChange={(v) => api("/api/demo/flags", { method: "PATCH", body: { failNextSend: v } })} label={t("profile.failNext")} hint={t("profile.failNextHint")} />
              </Card>
            )}
          </section>
        )}
      </div>

      {!live && <WalletSheet open={walletOpen} onOpenChange={setWalletOpen} current={p.walletAddress} />}

      <Sheet open={disconnectOpen} onOpenChange={setDisconnectOpen} title={t("wallet.disconnect")}>
        <p className="text-body text-muted-foreground">{t("wallet.disconnectConfirm")}</p>
        <Button variant="danger" size="lg" className="mt-4" loading={busy} onClick={disconnect}>
          {t("wallet.disconnect")}
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setDisconnectOpen(false)}>
          {t("app.cancel")}
        </Button>
      </Sheet>

      <DeleteAccountSheet open={deleteOpen} onOpenChange={setDeleteOpen} />
    </Screen>
  );
}

/** Asks for the password again before permanently deleting the account. */
function DeleteAccountSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/account", { method: "DELETE", body: { password } });
      clearClient();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload drops everything held in memory for the old session
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("app.genericError"));
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t("profile.deleteTitle")}>
      <p className="mb-4 text-body text-muted-foreground">{t("profile.deleteBody")}</p>
      <Field
        label={t("login.password")}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(null);
        }}
        error={error}
      />
      <Button variant="danger" size="lg" className="mt-4" loading={busy} disabled={!password} onClick={remove}>
        {t("profile.deleteConfirm")}
      </Button>
      <Button variant="ghost" className="mt-2 w-full" onClick={() => onOpenChange(false)}>
        {t("app.cancel")}
      </Button>
    </Sheet>
  );
}

/** Offline mode only: real wallets are connected through the wallet's own approval screen. */
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
