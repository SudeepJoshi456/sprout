"use client";

import { useState } from "react";
import { ChevronDown, FlaskConical, Radio } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { INTERLEDGER_EXPLAINER } from "@/data/interledger";
import { cn } from "@/lib/format";
import type { PaymentStep, PaymentsMode } from "@/lib/types";
import { t } from "@/i18n";

/**
 * Timeline of the Open Payments calls behind one payment. This is how we show
 * (and explain) what Interledger actually did, step by step.
 */
export function PaymentTrace({ steps, className }: { steps: PaymentStep[] | undefined; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!steps?.length) return <p className={cn("text-caption text-muted-foreground", className)}>{t("move.howNoTrace")}</p>;
  const simulated = steps.some((s) => s.simulated);
  return (
    <section aria-labelledby="trace-title" className={className}>
      <div className="flex items-center justify-between gap-2">
        <h3 id="trace-title" className="text-body font-semibold">
          {t("move.howTitle")}
        </h3>
        <span className={cn("inline-flex items-center gap-1 text-caption font-semibold", simulated ? "text-practice" : "text-info")}>
          {simulated ? <FlaskConical className="size-3.5" aria-hidden /> : <Radio className="size-3.5" aria-hidden />}
          {simulated ? t("app.simulated") : t("move.liveBadge")}
        </span>
      </div>
      <p className="mt-0.5 text-caption text-muted-foreground">{t("move.howSub")}</p>
      <ol className="mt-3">
        {steps.map((s, i) => {
          const expanded = open === i;
          const last = i === steps.length - 1;
          return (
            <li key={`${s.id}-${i}`} className="relative flex gap-3">
              <span className="flex flex-col items-center" aria-hidden>
                <span className="tnum mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                {!last && <span className="w-0.5 flex-1 bg-border" />}
              </span>
              <div className="min-w-0 flex-1 pb-2">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : i)}
                  aria-expanded={expanded}
                  className="flex min-h-11 w-full items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1 text-body font-medium">{s.label}</span>
                  <span className="tnum shrink-0 text-caption text-muted-foreground">{t("move.stepMs", { ms: s.ms })}</span>
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden />
                </button>
                {expanded && (
                  <div className="animate-fade-in rounded-xl bg-muted/60 p-3 text-caption">
                    <p className="break-words text-foreground/85">{s.detail}</p>
                    {s.server && <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{s.server}</p>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-caption text-muted-foreground">{simulated ? t("move.howSimulated") : t("move.howLive")}</p>
    </section>
  );
}

/** Full explainer sheet, opened from the Move header. */
export function InterledgerSheet({ open, onOpenChange, mode }: { open: boolean; onOpenChange: (o: boolean) => void; mode: PaymentsMode }) {
  const x = INTERLEDGER_EXPLAINER;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={x.title} description={x.intro}>
      <p className={cn("rounded-xl p-3 text-body", mode === "interledger" ? "bg-info-soft text-info" : "bg-practice-soft text-practice")}>
        {mode === "interledger" ? x.liveNote : x.simulatedNote}
      </p>
      <h3 className="mt-5 text-body font-semibold">Every payment, in 4 steps</h3>
      <ol className="mt-2 space-y-3">
        {x.steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="tnum flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-caption font-bold text-primary-foreground" aria-hidden>
              {i + 1}
            </span>
            <div>
              <p className="text-body font-semibold">{s.title}</p>
              <p className="text-body text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <h3 className="mt-5 text-body font-semibold">Words you&apos;ll hear</h3>
      <dl className="mt-2 space-y-3">
        {x.terms.map((term) => (
          <div key={term.term}>
            <dt className="text-body font-semibold">{term.term}</dt>
            <dd className="text-body text-muted-foreground">{term.body}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-5 text-body font-semibold">Built-in safety</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-body text-muted-foreground">
        {x.safety.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </Sheet>
  );
}
