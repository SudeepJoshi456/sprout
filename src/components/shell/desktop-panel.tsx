"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api, resetDemo } from "@/lib/client/api";
import { useClientState } from "@/lib/client/hooks";
import { cn } from "@/lib/format";
import type { PersonaId } from "@/lib/types";
import { t } from "@/i18n";
import { Wordmark } from "./wordmark";

const SCRIPT = [
  "Get started → \"I'm new to the US\" + \"I want to learn investing\"",
  "Verify with passport + F-1 visa, connect wallet",
  "Home: money from home arrived, rate shown",
  "Move: send rent to Ana — $0.00 fee, receipt",
  "Learn: \"How US credit scores work\" + quiz",
  "Grow: buy $500 of VOO → coach explains diversification",
  "Graduate card shows progress → switch to Marcus",
];

/**
 * Judges often open the link on a laptop. On wide screens we use the empty
 * space for the pitch, our principles, and presenter controls.
 */
export function DesktopPanel() {
  const state = useClientState();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const switchTo = async (persona: PersonaId) => {
    setBusy(true);
    try {
      await api("/api/persona", { method: "POST", body: { persona } });
      toast.success(t("profile.switched", { name: persona === "sudeep" ? "Sudeep" : "Marcus" }));
      router.push("/home");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await resetDemo();
      toast.success(t("profile.resetDone"));
      router.push("/");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="hidden max-w-sm flex-col gap-6 lg:flex" aria-label="About this demo">
      <Wordmark />
      <div>
        <h2 className="font-display text-display font-semibold">{t("desktop.pitchTitle")}</h2>
        <p className="mt-3 text-body leading-relaxed text-muted-foreground">{t("desktop.pitch")}</p>
        <p className="mt-3 font-display text-title text-primary">{t("app.tagline")}</p>
      </div>
      <div>
        <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{t("desktop.principles")}</h3>
        <ul className="mt-2 space-y-1.5">
          {(["p1", "p2", "p3", "p4"] as const).map((k) => (
            <li key={k} className="flex items-start gap-2 text-body">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {t(`desktop.${k}`)}
            </li>
          ))}
        </ul>
      </div>
      <details className="group rounded-2xl border border-border bg-card p-4">
        <summary className="cursor-pointer text-body font-semibold">{t("desktop.demoScript")}</summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-caption text-muted-foreground">
          {SCRIPT.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </details>
      {state && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["sudeep", "marcus"] as const).map((p) => (
              <button
                key={p}
                type="button"
                disabled={busy}
                onClick={() => switchTo(p)}
                aria-pressed={state.persona === p}
                className={cn(
                  "min-h-11 flex-1 rounded-xl border px-3 text-body font-semibold transition-colors",
                  state.persona === p ? "border-primary bg-positive-soft text-primary" : "border-input bg-card hover:bg-muted",
                )}
              >
                {p === "sudeep" ? "Sudeep" : "Marcus"}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={reset}
              className="inline-flex size-11 items-center justify-center rounded-xl border border-input bg-card hover:bg-muted"
              aria-label={t("profile.reset")}
              title={t("profile.reset")}
            >
              <RotateCcw className="size-4" aria-hidden />
            </button>
          </div>
          <p className="text-caption text-muted-foreground">
            {t("desktop.modes")}: {t("profile.modePayments")} <strong>{state.modes.payments}</strong> · {t("profile.modeAi")}{" "}
            <strong>{state.modes.ai}</strong> · {t("profile.modeMarket")} <strong>{state.modes.market}</strong>
          </p>
        </div>
      )}
      <p className="text-caption text-muted-foreground">{t("desktop.hackathon")}</p>
    </aside>
  );
}
