"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, CircleDollarSign, Layers, TrendingUp, TriangleAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { BrandMark } from "@/components/grow/brand-tile";
import { SP500_FUND, type Brand } from "@/data/brands";
import { cn } from "@/lib/format";
import { t } from "@/i18n";

type Vote = "yes" | "unsure" | "no";

/**
 * The brand page's teaching sections: how the company makes money, the
 * "Would you invest?" check (profit, growth, risk), a quick reflection, and the
 * reminder that one index fund already owns most of these brands.
 */
export function BrandSections({ brand, company }: { brand: Brand; company: string }) {
  return (
    <>
      <Card aria-labelledby="money-title">
        <div className="mb-3 flex items-center gap-3">
          <BrandMark brand={brand} />
          <div className="min-w-0">
            <h2 id="money-title" className="font-display text-title font-semibold">
              {t("brandPage.howMoney", { name: company })}
            </h2>
            <p className="truncate text-caption text-muted-foreground">{brand.known}</p>
          </div>
        </div>
        <p className="text-body">{brand.howItMakesMoney}</p>
      </Card>

      <WouldYouInvest brand={brand} company={company} />

      {brand.inSP500 && (
        <Link href={`/grow/${SP500_FUND}`} className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-accent/40 p-4 hover:border-primary">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
            <Layers className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold">{t("brandPage.inIndexTitle", { name: company, fund: SP500_FUND })}</span>
            <span className="mt-0.5 block text-caption text-foreground/80">{t("brandPage.inIndexBody", { fund: SP500_FUND })}</span>
          </span>
          <ChevronRight className="mt-3 size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      )}
    </>
  );
}

function WouldYouInvest({ brand, company }: { brand: Brand; company: string }) {
  const [vote, setVote] = useState<Vote | null>(null);
  const rows = [
    { id: "profit", label: t("brandPage.profit"), text: brand.check.profit, Icon: CircleDollarSign, tone: "text-positive" },
    { id: "growth", label: t("brandPage.growth"), text: brand.check.growth, Icon: TrendingUp, tone: "text-primary" },
    { id: "risk", label: t("brandPage.risk"), text: brand.check.risk, Icon: TriangleAlert, tone: "text-warning" },
  ];
  const options: { id: Vote; label: string }[] = [
    { id: "yes", label: t("brandPage.voteYes") },
    { id: "unsure", label: t("brandPage.voteUnsure") },
    { id: "no", label: t("brandPage.voteNo") },
  ];
  return (
    <Card aria-labelledby="check-title">
      <CardHeader id="check-title" title={t("brandPage.checkTitle")} />
      <p className="-mt-2 mb-3 text-caption text-muted-foreground">{t("brandPage.checkSub")}</p>
      <dl className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="flex items-start gap-3">
            <r.Icon className={cn("mt-0.5 size-5 shrink-0", r.tone)} aria-hidden />
            <div className="min-w-0">
              <dt className="text-caption font-semibold text-muted-foreground">{r.label}</dt>
              <dd className="text-body">{r.text}</dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-caption text-muted-foreground">{t("brandPage.factsAsOf")}</p>

      <fieldset className="mt-4 border-t border-border pt-4">
        <legend className="text-body font-semibold">{t("brandPage.voteQuestion", { name: company })}</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={vote === o.id}
              onClick={() => setVote(o.id)}
              className={cn(
                "min-h-11 rounded-xl border-2 px-2 text-body font-semibold",
                vote === o.id ? "border-primary bg-accent/50" : "border-border hover:bg-muted",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {vote && (
          <p role="status" className="mt-3 rounded-xl bg-muted p-3 text-body">
            {vote === "yes" ? t("brandPage.reflectYes") : vote === "unsure" ? t("brandPage.reflectUnsure") : t("brandPage.reflectNo")}
          </p>
        )}
      </fieldset>
    </Card>
  );
}
