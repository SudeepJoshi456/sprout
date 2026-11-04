"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Compass, Flame, PlayCircle, Search } from "lucide-react";
import { Screen } from "@/components/shell/screen";
import { Segmented } from "@/components/ui/segmented";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { SkeletonCard } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { Field } from "@/components/ui/field";
import { TermBody } from "@/components/ui/term";
import { LessonCard } from "@/components/learn/lesson-card";
import { COURSE_SUBTITLE, COURSE_TITLE, COURSE_UNITS } from "@/data/course";
import { GLOSSARY } from "@/data/glossary";
import { useAppState, useResource } from "@/lib/client/hooks";
import { cn } from "@/lib/format";
import type { LessonsResponse } from "@/lib/api-types";
import type { LessonSummary } from "@/lib/types";
import { t } from "@/i18n";

type Tab = "course" | "glossary";

/** ★ Learn: the "Starting from Zero" course, personalized picks, and a glossary. */
export default function LearnPage() {
  const [tab, setTab] = useState<Tab>("course");
  return (
    <Screen
      title={t("learn.title")}
      banner={
        <div className="px-4 pb-3">
          <Segmented<Tab>
            label={t("learn.sectionTabs")}
            value={tab}
            onChange={setTab}
            controls="learn"
            options={[
              { value: "course", label: t("learn.course") },
              { value: "glossary", label: t("learn.glossary") },
            ]}
          />
        </div>
      }
    >
      <div role="tabpanel" id={`learn-panel-${tab}`} aria-labelledby={`learn-tab-${tab}`}>
        {tab === "course" ? <Course /> : <Glossary />}
      </div>
    </Screen>
  );
}

function Course() {
  const { persona, user } = useAppState();
  const { data, loading } = useResource<LessonsResponse>(`/api/lessons?p=${persona}`);
  const byId = useMemo(() => new Map((data?.lessons ?? []).map((l) => [l.id, l])), [data]);

  if (loading || !data) {
    return (
      <div className="space-y-3 pt-2">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
    );
  }

  const done = data.lessons.filter((l) => l.completed).length;
  const total = data.lessons.length;
  const picks = data.lessons.filter((l) => !l.completed && l.reason).slice(0, 2);
  const tourDone = user.learning.walkthroughs.includes("stock-page");

  return (
    <div className="space-y-6 pt-2">
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{t("learn.courseLabel")}</p>
            <h2 className="font-display text-title font-semibold">{COURSE_TITLE}</h2>
          </div>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-caption font-semibold", data.streak > 0 ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground")}>
            <Flame className="size-4" aria-hidden />
            {data.streak > 0 ? t("learn.streak", { n: data.streak }) : t("learn.streakZero")}
          </span>
        </div>
        <p className="text-body text-muted-foreground">{COURSE_SUBTITLE}</p>
        <ProgressBar value={done / total} label={t("learn.progress", { done, total })} />
        <p className="tnum text-caption text-muted-foreground">{t("learn.progress", { done, total })}</p>
      </Card>

      {picks.length > 0 && (
        <section aria-labelledby="for-you">
          <h2 id="for-you" className="mb-2 px-1 text-body font-semibold">
            {t("learn.forYou")}
          </h2>
          <div className="space-y-3">
            {picks.map((l, i) => (
              <LessonCard key={l.id} lesson={l} featured={i === 0} />
            ))}
          </div>
        </section>
      )}

      {COURSE_UNITS.map((unit, ui) => {
        const lessons = unit.lessonIds.map((id) => byId.get(id)).filter((l): l is LessonSummary => Boolean(l));
        const unitDone = lessons.filter((l) => l.completed).length;
        const nextId = lessons.find((l) => !l.completed)?.id;
        return (
          <section key={unit.id} aria-labelledby={`unit-${unit.id}`} className="rounded-2xl border border-border/70 bg-card shadow-card">
            <div className="flex items-start gap-3 p-4 pb-2">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon name={unit.icon} className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{t("learn.unit", { n: ui + 1 })}</p>
                <h2 id={`unit-${unit.id}`} className="text-title font-semibold leading-snug">
                  {unit.title}
                </h2>
                <p className="text-body text-muted-foreground">{unit.summary}</p>
              </div>
              <span className="tnum shrink-0 text-caption font-semibold text-muted-foreground">
                {unitDone}/{lessons.length}
              </span>
            </div>
            <ol className="divide-y divide-border/70 px-2 pb-2">
              {lessons.map((l) => (
                <li key={l.id}>
                  <Link href={`/learn/${l.id}`} className="flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/60">
                    {l.completed ? (
                      <CheckCircle2 className="size-6 shrink-0 text-positive" aria-label={t("learn.done")} />
                    ) : (
                      <PlayCircle className={cn("size-6 shrink-0", l.id === nextId ? "text-primary" : "text-muted-foreground")} aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-medium leading-snug">{l.title}</span>
                      <span className="block text-caption text-muted-foreground">
                        {t("learn.minutes", { n: l.minutes })}
                        {l.id === nextId && !l.completed ? ` · ${t("learn.upNext")}` : ""}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <section aria-labelledby="walks">
        <h2 id="walks" className="mb-2 px-1 text-body font-semibold">
          {t("learn.walkthroughs")}
        </h2>
        <Link href="/grow/AAPL?tour=stock-page" className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card hover:border-primary">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-practice-soft text-practice">
            <Compass className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold">{t("learn.walkStock")}</span>
            <span className="block text-caption text-muted-foreground">{tourDone ? t("learn.walkStockDone") : t("learn.walkStockSub")}</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
        </Link>
      </section>

      <p className="px-1 text-caption text-muted-foreground">{t("learn.sourcesNote")}</p>
    </div>
  );
}

function Glossary() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const query = q.trim().toLowerCase();
  const items = GLOSSARY.filter((g) => !query || g.term.toLowerCase().includes(query) || g.definition.toLowerCase().includes(query)).sort((a, b) =>
    a.term.localeCompare(b.term),
  );
  return (
    <div className="space-y-4 pt-2">
      <Field
        label={t("learn.glossarySearch")}
        labelHidden
        placeholder={t("learn.glossarySearch")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        trailing={<Search className="size-5 text-muted-foreground" aria-hidden />}
      />
      {items.length === 0 ? (
        <p className="text-body text-muted-foreground">{t("learn.glossaryEmpty", { q })}</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border/70 bg-card">
          {items.map((g) => {
            const expanded = open === g.id;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : g.id)}
                  aria-expanded={expanded}
                  className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-body font-semibold"
                >
                  <span className="flex-1">{g.term}</span>
                  <ChevronRight className={cn("size-5 text-muted-foreground transition-transform", expanded && "rotate-90")} aria-hidden />
                </button>
                {expanded && (
                  <div className="animate-fade-in px-4 pb-4">
                    <TermBody id={g.id} />
                    {g.lessonId && (
                      <Link href={`/learn/${g.lessonId}`} className="mt-3 inline-flex min-h-11 items-center gap-1 text-body font-semibold text-primary">
                        {t("terms.relatedLesson")}
                        <ChevronRight className="size-4" aria-hidden />
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
