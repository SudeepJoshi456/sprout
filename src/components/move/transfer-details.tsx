"use client";

import { Badge, SimulatedBadge } from "@/components/ui/badge";
import { PaymentTrace } from "./payment-trace";
import { formatDateTime, formatForeign, formatMoney } from "@/lib/format";
import type { Transfer } from "@/lib/types";
import { t } from "@/i18n";
/** Receipt rows for a transfer, plus the Interledger step trace. */
export function TransferDetails({ transfer }: { transfer: Transfer }) {
  const out = transfer.direction === "out";
  const sentAmount = transfer.debit.value - (out ? transfer.feeCents : 0);
  const rows: Array<[string, React.ReactNode]> = [
    [out ? t("move.to") : t("move.received"), <span key="n" className="text-right">{transfer.counterpartyName}<span className="block break-all text-caption text-muted-foreground">{transfer.counterpartyWallet}</span></span>],
    [out ? t("move.youSend") : t("move.received"), formatMoney(sentAmount)],
  ];
  if (out) {
    rows.push([t("move.fee"), formatMoney(transfer.feeCents)]);
    rows.push([t("move.totalCharged"), <strong key="t">{formatMoney(transfer.debit.value)}</strong>]);
  }
  if (transfer.rate) {
    rows.push([t("move.rate"), t("move.rateValue", { rate: `${transfer.rate} ${transfer.counterpart.currency}` })]);
  }
  if (out) {
    rows.push([t("move.theyReceive", { name: transfer.counterpartyName.split(" (")[0] }), <strong key="r">{formatForeign(transfer.counterpart.value, transfer.counterpart.currency)}</strong>]);
  } else if (transfer.rate) {
    rows.push(["Sent from home", formatForeign(transfer.counterpart.value, transfer.counterpart.currency)]);
  }
  rows.push([t("move.status"), <Badge key="s" tone="positive">{t("move.statusCompleted")}</Badge>]);
  rows.push([t("move.when"), formatDateTime(transfer.createdAt)]);
  rows.push([
    t("move.via"),
    transfer.mode === "interledger" ? (
      <Badge key="v" tone="info">{t("move.viaInterledger")}</Badge>
    ) : (
      <SimulatedBadge key="v" label={t("move.viaMock")} />
    ),
  ]);
  if (transfer.note) rows.push([t("move.note"), transfer.note]);
  rows.push([t("move.transferId"), <span key="id" className="font-mono text-caption">{transfer.id.slice(0, 8).toUpperCase()}</span>]);

  return (
    <div className="space-y-5">
      <dl className="divide-y divide-border rounded-2xl border border-border bg-card">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 px-4 py-3">
            <dt className="shrink-0 text-body text-muted-foreground">{label}</dt>
            <dd className="tnum min-w-0 text-right text-body">{value}</dd>
          </div>
        ))}
      </dl>
      {transfer.externalId && <p className="break-all font-mono text-[11px] text-muted-foreground">{transfer.externalId}</p>}
      <PaymentTrace steps={transfer.steps} />
    </div>
  );
}
