"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { api, ApiClientError } from "@/lib/client/api";
import { useClientState } from "@/lib/client/hooks";
import { cn } from "@/lib/format";
import { t } from "@/i18n";

/**
 * Lets the demo switch between the real test-network wallets: which one live
 * sends debit ("send"), or which one the Receive tab shows and watches
 * ("receive"). Hidden unless more than one wallet is configured.
 */
export function WalletPicker({ purpose, className }: { purpose: "send" | "receive"; className?: string }) {
  const state = useClientState();
  const [busy, setBusy] = useState<string | null>(null);
  const wallets = state?.wallets ?? [];
  if (!state || wallets.length < 2) return null;

  const current = purpose === "send" ? state.sendFrom : state.user.profile.walletAddress;
  const pick = async (url: string, label: string) => {
    if (url === current || busy) return;
    setBusy(url);
    try {
      await api("/api/profile", { method: "PATCH", body: purpose === "send" ? { sendFrom: url } : { walletAddress: url } });
      toast.success(t("move.walletSwitched", { name: label }));
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <fieldset className={cn("rounded-2xl border border-border bg-card p-3", className)}>
      <legend className="px-1 text-caption font-semibold text-muted-foreground">
        {purpose === "send" ? t("move.sendFrom") : t("move.receiveInto")}
      </legend>
      <div role="radiogroup" aria-label={purpose === "send" ? t("move.sendFrom") : t("move.receiveInto")} className="grid grid-cols-2 gap-2">
        {wallets.map((w) => {
          const on = w.url === current;
          const blocked = purpose === "send" && !w.canSend;
          return (
            <button
              key={w.url}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={blocked || busy !== null}
              onClick={() => pick(w.url, w.label)}
              className={cn(
                "flex min-h-14 flex-col items-start rounded-xl border-2 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed",
                on ? "border-primary bg-accent/40" : "border-border hover:border-input",
                blocked && "opacity-60",
              )}
            >
              <span className="flex items-center gap-1.5 text-body font-semibold">
                <Wallet className="size-4 text-primary" aria-hidden />
                {w.label}
              </span>
              <span className="truncate text-caption text-muted-foreground">
                {blocked ? t("move.walletNeedsApproval") : w.url.split("/").pop()}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
