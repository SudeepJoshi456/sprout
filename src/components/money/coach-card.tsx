"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { api } from "@/lib/client/api";
import type { CoachMessage } from "@/lib/types";
import { t } from "@/i18n";
import { cn } from "@/lib/format";

/**
 * One coach insight at a time. Dismissal is optimistic (safe: no money moves).
 * Every coach message carries the not-advice disclaimer.
 */
export function CoachCard({ message, className }: { message: CoachMessage; className?: string }) {
  const dismiss = () => {
    void api(`/api/coach/${message.id}/dismiss`, { method: "POST" });
  };
  return (
    <section aria-label={t("home.coachLabel")} className={cn("relative rounded-2xl border border-primary/20 bg-positive-soft p-4", className)}>
      <div className="flex items-start gap-3 pr-8">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-primary">
          <Sparkles className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-wide text-primary">{t("home.coachLabel")}</p>
          <h3 className="mt-0.5 font-sans text-body font-semibold text-foreground">{message.title}</h3>
          <p className="mt-1 text-body text-foreground/85">{message.body}</p>
          {message.lessonId && (
            <Link
              href={`/learn/${message.lessonId}`}
              className="mt-2 inline-flex min-h-11 items-center gap-1 text-body font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t("grow.viewLesson")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
          <p className="mt-1 text-caption text-muted-foreground">{t("home.coachNote")}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("home.dismiss")}
        className="absolute right-1.5 top-1.5 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-card"
      >
        <X className="size-5" aria-hidden />
      </button>
    </section>
  );
}

export function activeCoach(messages: CoachMessage[]) {
  return messages.find((m) => !m.dismissed) ?? null;
}
