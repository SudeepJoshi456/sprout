"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, FlaskConical } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Change } from "@/components/ui/money";
import { formatPrice, formatPercent, cn } from "@/lib/format";
import type { Quote } from "@/lib/types";
import { t } from "@/i18n";

/** Always-visible practice-mode strip with the play-money rules one tap away. */
export function PracticeBanner() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-10 w-full items-center justify-center gap-1.5 bg-practice-soft px-4 text-caption font-semibold text-practice"
      >
        <FlaskConical className="size-3.5" aria-hidden />
        {t("app.practiceBanner")}
        <span className="underline underline-offset-2">{t("grow.rules")}</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={t("grow.rules")}>
        <div className="space-y-3 text-body">
          <p>{t("grow.rulesBody")}</p>
          <p className="text-muted-foreground">{t("grow.rulesPrices")}</p>
          <p className="text-muted-foreground">{t("grow.noAdvice")}</p>
        </div>
      </Sheet>
    </>
  );
}

export function QuoteRow({ quote, className }: { quote: Quote; className?: string }) {
  const up = quote.changePct > 0;
  const down = quote.changePct < 0;
  return (
    <Link href={`/grow/${quote.symbol}`} className={cn("flex min-h-16 items-center gap-3 py-2", className)}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-caption font-bold text-secondary-foreground">
        {quote.symbol.slice(0, 4)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold">{quote.name}</span>
        <span className="block truncate text-caption text-muted-foreground">
          {quote.symbol} · {quote.kind === "etf" ? t("grow.typeEtf") : quote.sector}
        </span>
      </span>
      <span className="text-right">
        <span className="tnum block text-body font-semibold">{formatPrice(quote.price)}</span>
        <span className={cn("tnum block text-caption font-semibold", up ? "text-positive" : down ? "text-negative" : "text-muted-foreground")}>
          {up ? "▲ " : down ? "▼ " : ""}
          {formatPercent(quote.changePct, { signed: true })}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

export { Change };
