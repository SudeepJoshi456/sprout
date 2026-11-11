"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ApiClientError, invalidate } from "@/lib/client/api";
import { cn } from "@/lib/format";
import { t } from "@/i18n";
import { isFullAddress, toWalletUrl, walletNameFrom, WALLET_HOST } from "@/lib/wallet-address";

const CAPS = [5_000, 20_000, 50_000];
const LAST_WALLET_KEY = "sprout:last-wallet";

export type WalletReturn = "/profile" | "/onboarding" | "/move" | "/home";

/** Shows how the wallet approval went when the wallet sends the person back (?wallet=…). Wrap in Suspense. */
export function WalletReturnNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("wallet");
  const shown = useRef(false);
  useEffect(() => {
    if (!status || shown.current) return;
    shown.current = true;
    if (status === "connected") {
      toast.success(t("wallet.connected"));
      void api("/api/state");
      invalidate("/api/wallet");
    } else if (status === "declined") toast(t("wallet.declined"));
    else toast.error(t("wallet.failed"));
    const url = new URL(window.location.href);
    url.searchParams.delete("wallet");
    router.replace(url.pathname + url.search);
  }, [status, router]);
  return null;
}

/**
 * Starts connecting the person's own wallet. The server asks the wallet for
 * permission and we send the browser there; the wallet sends them back to
 * `returnTo` with ?wallet=connected|declined|failed.
 */
export function ConnectWallet({ returnTo, className }: { returnTo: WalletReturn; className?: string }) {
  const [address, setAddress] = useState("");
  const [cap, setCap] = useState(20_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggest the wallet name this browser connected last time.
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_WALLET_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
      if (last) setAddress((a) => a || last);
    } catch {}
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return setError(t("wallet.addressHint"));
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ redirect: string }>("/api/wallet/connect", { method: "POST", body: { walletAddress: toWalletUrl(address), capCents: cap, returnTo } });
      try {
        localStorage.setItem(LAST_WALLET_KEY, walletNameFrom(address));
      } catch {}
      const target = new URL(res.redirect);
      if (target.protocol !== "https:") throw new ApiClientError(0, "bad_redirect", t("wallet.failed"));
      window.location.assign(target.toString());
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("wallet.failed"));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={cn("space-y-4", className)} noValidate>
      <div>
        <label htmlFor="wallet-address" className="mb-1.5 block text-body font-semibold">
          {t("wallet.addressLabel")}
        </label>
        <div className="flex h-12 w-full items-center overflow-hidden rounded-xl border border-input bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
          {!isFullAddress(address) && (
            <span className="shrink-0 select-none pl-3 text-[16px] text-muted-foreground" aria-hidden>
              {WALLET_HOST}/
            </span>
          )}
          <input
            id="wallet-address"
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={address}
            onChange={(e) => {
              setAddress(walletNameFrom(e.target.value));
              setError(null);
            }}
            placeholder="yourname"
            aria-describedby="wallet-address-hint wallet-error"
            aria-invalid={Boolean(error)}
            className={cn("h-full min-w-0 flex-1 bg-transparent pr-3 text-[16px] outline-none", isFullAddress(address) ? "pl-3" : "pl-0.5")}
          />
        </div>
        <p id="wallet-address-hint" className="mt-1 text-caption text-muted-foreground">
          {t("wallet.addressHint")}
        </p>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-body font-semibold">{t("wallet.capLabel")}</legend>
        <div role="radiogroup" aria-label={t("wallet.capLabel")} className="grid grid-cols-3 gap-2">
          {CAPS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cap === c}
              onClick={() => setCap(c)}
              className={cn(
                "min-h-11 rounded-xl border text-body font-semibold",
                cap === c ? "border-primary bg-positive-soft text-primary" : "border-input bg-card hover:bg-muted",
              )}
            >
              ${c / 100}
            </button>
          ))}
        </div>
        <p className="mt-1 flex items-start gap-1.5 text-caption text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
          {t("wallet.capHint")}
        </p>
      </fieldset>
      {error && (
        <p id="wallet-error" role="alert" className="text-body font-medium text-negative">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={busy} aria-busy={busy}>
        {busy ? t("wallet.connecting") : t("wallet.connect")}
      </Button>
      <a
        href="https://wallet.interledger-test.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center justify-center gap-1.5 text-body font-semibold text-primary underline-offset-4 hover:underline"
      >
        {t("wallet.noWallet")}
        <ExternalLink className="size-4" aria-hidden />
      </a>
    </form>
  );
}
