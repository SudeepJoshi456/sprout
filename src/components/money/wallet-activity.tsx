"use client";

import { ArrowDownLeft, ArrowUpRight, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useResource } from "@/lib/client/hooks";
import { cn, formatForeign, formatMoney, relativeDays } from "@/lib/format";
import type { WalletActivity, WalletActivityItem } from "@/lib/types";
import { t } from "@/i18n";

export const amountIn = (minor: number, currency: string) => (currency === "USD" ? formatMoney(minor) : formatForeign(minor, currency));

const walletName = (url: string) => url.replace(/^https:\/\//, "");

/** Real money in and out of the connected wallet, read from the wallet itself. */
export function WalletActivityCard({ limit = 3, children }: { limit?: number; children?: React.ReactNode }) {
  const { data, error, loading } = useResource<WalletActivity>("/api/wallet/activity");

  return (
    <Card aria-labelledby="wallet-activity-title" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="wallet-activity-title" className="font-display text-title font-semibold">
            {t("wallet.activityTitle")}
          </h2>
          <p className="truncate text-caption text-muted-foreground">{data?.connected ? walletName(data.wallet) : t("wallet.activitySub")}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-positive-soft px-2 py-0.5 text-caption font-semibold text-primary">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          {t("wallet.activitySub")}
        </span>
      </div>

      {loading && !data ? (
        <div className="mt-4 grid grid-cols-2 gap-3" aria-hidden>
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : error && !data ? (
        <p role="alert" className="mt-4 text-body text-muted-foreground">
          {t("wallet.loadError")}
        </p>
      ) : data?.connected ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Total label={t("wallet.received")} value={amountIn(data.receivedMinor, data.currency)} icon={<ArrowDownLeft className="size-4" aria-hidden />} />
            <Total label={t("wallet.sent")} value={amountIn(data.sentMinor, data.currency)} icon={<ArrowUpRight className="size-4" aria-hidden />} />
          </dl>
          <p className="mt-2 flex items-start gap-1.5 text-caption text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("wallet.noBalance")}
          </p>
          {data.partial && <p className="mt-1 text-caption font-medium text-warning">{t("wallet.partial")}</p>}
          <h3 className="mb-1 mt-4 text-body font-semibold">{t("wallet.recent")}</h3>
          {data.items.length === 0 ? (
            <p className="text-body text-muted-foreground">{t("wallet.none")}</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {data.items.slice(0, limit).map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </>
      ) : null}
      {children}
    </Card>
  );
}

function Total({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted p-3">
      <dt className="flex items-center gap-1 text-caption font-semibold text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </dt>
      <dd className="tnum truncate font-display text-title font-semibold">{value}</dd>
    </div>
  );
}

function ActivityRow({ item }: { item: WalletActivityItem }) {
  const out = item.direction === "out";
  const who = out ? t("wallet.to", { who: item.counterparty ? walletName(item.counterparty).split("/incoming-payments")[0] : "…" }) : t("wallet.from");
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", out ? "bg-secondary text-primary" : "bg-positive-soft text-positive")}>
        {out ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownLeft className="size-4" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium">{item.description ?? who}</span>
        <span className="block truncate text-caption text-muted-foreground">
          {item.description ? `${who} · ` : ""}
          {relativeDays(item.at)}
          {item.status === "pending" && ` · ${t("wallet.pending")}`}
          {item.status === "failed" && ` · ${t("wallet.failedItem")}`}
        </span>
      </span>
      <span className={cn("tnum shrink-0 text-body font-semibold", out ? "" : "text-positive", item.status === "failed" && "line-through opacity-60")}>
        {out ? "−" : "+"}
        {amountIn(item.amount, item.currency)}
      </span>
    </li>
  );
}
