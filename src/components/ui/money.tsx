import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn, formatMoney, formatPercent, type MoneyOpts } from "@/lib/format";

/** Money with tabular numerals. */
export function Money({ cents, className, ...opts }: { cents: number; className?: string } & MoneyOpts) {
  return <span className={cn("tnum", className)}>{formatMoney(cents, opts)}</span>;
}

/**
 * Gain/loss display that never relies on color alone: it uses a sign, an
 * arrow icon, and a screen-reader word ("up"/"down") as well as color.
 */
export function Change({
  cents,
  pct,
  suffix,
  className,
  size = "body",
}: {
  cents: number;
  pct?: number;
  suffix?: string;
  className?: string;
  size?: "caption" | "body";
}) {
  const dir = cents > 0 ? "up" : cents < 0 ? "down" : "flat";
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  const color = dir === "up" ? "text-positive" : dir === "down" ? "text-negative" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold", size === "caption" ? "text-caption" : "text-body", color, className)}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">{dir === "up" ? "Up" : dir === "down" ? "Down" : "No change"} </span>
      <span className="tnum">
        {formatMoney(cents, { signed: true })}
        {pct !== undefined && ` (${formatPercent(pct, { signed: true })})`}
      </span>
      {suffix && <span className="font-medium">{suffix}</span>}
    </span>
  );
}
