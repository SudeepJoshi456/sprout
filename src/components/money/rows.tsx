import { ArrowDownLeft, ArrowUpRight, CalendarClock } from "lucide-react";
import { CategoryIcon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatForeign, formatMoney, msFromNow, relativeDays, cn } from "@/lib/format";
import type { Bill, Transfer } from "@/lib/types";
import { t } from "@/i18n";

export function BillRow({ bill, action }: { bill: Bill; action?: React.ReactNode }) {
  const covered = bill.setAsideCents >= bill.amountCents;
  const soon = !bill.paid && msFromNow(bill.dueDate) < 3 * 86_400_000;
  return (
    <div className="flex items-center gap-3 py-3">
      <CategoryIcon category={bill.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium">{bill.name}</p>
        <p className={cn("flex items-center gap-1 text-caption", soon ? "font-semibold text-warning" : "text-muted-foreground")}>
          {soon && <CalendarClock className="size-3.5" aria-hidden />}
          {bill.paid ? t("budget.paid") : t("home.due", { when: `${relativeDays(bill.dueDate)} · ${formatDate(bill.dueDate)}` })}
        </p>
      </div>
      <div className="text-right">
        <p className="tnum text-body font-semibold">{formatMoney(bill.amountCents)}</p>
        {bill.paid ? (
          <Badge tone="positive">{t("budget.paid")}</Badge>
        ) : covered ? (
          <p className="text-caption text-positive">{t("home.fullySetAside")}</p>
        ) : (
          <p className="text-caption text-warning">{t("home.setAside", { amount: formatMoney(bill.setAsideCents, { trimZeroCents: true }) })}</p>
        )}
      </div>
      {action}
    </div>
  );
}

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
