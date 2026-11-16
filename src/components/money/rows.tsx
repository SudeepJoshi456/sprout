import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatDate, formatForeign, formatMoney, cn } from "@/lib/format";
import type { Transfer } from "@/lib/types";
import { t } from "@/i18n";

export function TransferRow({ transfer, onClick }: { transfer: Transfer; onClick?: () => void }) {
  const incoming = transfer.direction === "in";
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
  const body = (
    <>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", incoming ? "bg-positive-soft text-positive" : "bg-secondary text-secondary-foreground")}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium">
          {incoming ? t("move.receivedFrom", { name: transfer.counterpartyName }) : t("move.sentTo", { name: transfer.counterpartyName })}
        </span>
        <span className="block truncate text-caption text-muted-foreground">
          {formatDate(transfer.createdAt)}
          {transfer.rate ? ` · ${formatForeign(transfer.counterpart.value, transfer.counterpart.currency)}` : ""}
          {transfer.note ? ` · ${transfer.note}` : ""}
        </span>
      </span>
      <span className={cn("tnum text-body font-semibold", incoming && "text-positive")}>
        {incoming ? "+" : "−"}
        {formatMoney(transfer.debit.value)}
      </span>
    </>
  );
  if (!onClick) return <div className="flex items-center gap-3 py-3">{body}</div>;
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">
      {body}
    </button>
  );
}
