"use client";

import { useState } from "react";
import { BookOpen, CalendarDays, Lock } from "lucide-react";
import { Screen } from "@/components/shell/screen";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useAppState, useResource } from "@/lib/client/hooks";
import { GRADUATE_DAYS, GRADUATE_LESSONS } from "@/lib/progress";
import type { PortfolioResponse } from "@/lib/api-types";
import { t } from "@/i18n";

/** Locked "graduate to real investing" screen. Nothing here moves real money. */
export default function GraduatePage() {
  const { persona } = useAppState();
  const { data } = useResource<PortfolioResponse>(`/api/portfolio?range=1D&p=${persona}`);
  const [notified, setNotified] = useState(false);
  const g = data?.portfolio.graduate;

  return (
    <Screen title={t("grow.graduateTitle")} back="/grow">
      <div className="space-y-4 pt-3">
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="size-8" aria-hidden />
          </span>
          <h2 className="mt-3 font-display text-headline font-semibold">{t("grow.lockedTitle")}</h2>
          <p className="mt-1 max-w-xs text-body text-muted-foreground">{t("grow.lockedBody")}</p>
        </div>

        {!g ? (
          <SkeletonCard lines={3} />
        ) : (
          <Card aria-labelledby="grad-progress">
            <CardHeader id="grad-progress" title={t("grow.graduateCta")} />
            <div className="space-y-4">
              <Req
                icon={<BookOpen className="size-5" aria-hidden />}
                label={t("grow.graduateLessons", { n: Math.min(g.lessons, GRADUATE_LESSONS), total: GRADUATE_LESSONS })}
                value={g.lessons / GRADUATE_LESSONS}
              />
              <Req
                icon={<CalendarDays className="size-5" aria-hidden />}
                label={t("grow.graduateDays", { n: Math.min(g.days, GRADUATE_DAYS), total: GRADUATE_DAYS })}
                value={g.days / GRADUATE_DAYS}
              />
            </div>
          </Card>
        )}

        <Card aria-labelledby="grad-why">
          <CardHeader id="grad-why" title={t("grow.lockedWhy")} />
          <ul className="list-disc space-y-2 pl-5 text-body">
            <li>{t("grow.lockedWhy1")}</li>
            <li>{t("grow.lockedWhy2")}</li>
            <li>{t("grow.lockedWhy3")}</li>
          </ul>
        </Card>

        <Button size="lg" variant={notified ? "secondary" : "primary"} disabled={notified} onClick={() => setNotified(true)}>
          {notified ? t("grow.lockedNotified") : t("grow.lockedNotify")}
        </Button>
        <ButtonLink href="/learn" variant="ghost" className="w-full">
          {t("learn.title")}
        </ButtonLink>
        <p className="text-center text-caption text-muted-foreground">{t("grow.graduateLocked")}</p>
      </div>
    </Screen>
  );
}

function Req({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{label}</p>
        <ProgressBar className="mt-2" value={value} label={label} tone={value >= 1 ? "positive" : "practice"} />
      </div>
    </div>
  );
}
