"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Pause, Play, Sparkles, X, XCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon, TONE_BG } from "@/components/ui/icon";
import { LESSON_SOURCES } from "@/data/lessons";
import { api, ApiClientError, invalidate } from "@/lib/client/api";
import { useAppState, useReducedMotion, useResource } from "@/lib/client/hooks";
import { cn } from "@/lib/format";
import type { LessonResponse, LessonsResponse } from "@/lib/api-types";
import type { LessonContent } from "@/lib/types";
import { t } from "@/i18n";

const CARD_MS = 7000;

/** ★ Lesson player: story cards → quick check → result. */
export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { persona } = useAppState();
  const { data, error, reload } = useResource<LessonResponse>(`/api/lessons/${id}?p=${persona}`);
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-2 pt-1">
        <button
          type="button"
          onClick={() => router.push("/learn")}
          aria-label={t("lesson.closeLesson")}
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted"
        >
          <X className="size-6" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-body font-semibold">{data?.lesson.title ?? t("lesson.loadingTitle")}</p>
        {data?.lesson.source === "ai" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-practice-soft px-2 py-0.5 text-caption font-semibold text-practice">
            <Sparkles className="size-3.5" aria-hidden />
            {t("lesson.aiBadge")}
          </span>
        )}
      </div>
      {error ? (
        <main id="main" className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-body">{error.message}</p>
          <Button onClick={() => reload()}>{t("app.retry")}</Button>
        </main>
      ) : !data ? (
        <main id="main" className="flex-1 space-y-3 p-4" aria-busy>
          <p className="sr-only" role="status">
            {t("lesson.generating")}
          </p>
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-[60%] w-full rounded-3xl" />
        </main>
      ) : (
        <Player key={data.lesson.id} lesson={data.lesson} />
      )}
    </div>
  );
}

type Stage = "cards" | "quiz" | "result";

function Player({ lesson }: { lesson: LessonContent }) {
  const [stage, setStage] = useState<Stage>("cards");
  const [score, setScore] = useState(0);
  if (stage === "cards") return <Cards lesson={lesson} onDone={() => setStage("quiz")} />;
  if (stage === "quiz")
    return (
      <Quiz
        lesson={lesson}
        onDone={(s) => {
          setScore(s);
          setStage("result");
        }}
      />
    );
  return <Result lesson={lesson} score={score} onReplay={() => setStage("cards")} />;
}

function Cards({ lesson, onDone }: { lesson: LessonContent; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(reduced);
  const [elapsed, setElapsed] = useState(0);
  const touchX = useRef<number | null>(null);
  const total = lesson.cards.length;
  const card = lesson.cards[i];

  const go = useCallback(
    (dir: 1 | -1) => {
      setElapsed(0);
      if (dir === 1 && i === total - 1) return onDone();
      setI((x) => Math.max(0, Math.min(total - 1, x + dir)));
    },
    [i, total, onDone],
  );

  // Auto-advance (off for reduced motion; pausable).
  useEffect(() => {
    if (paused || reduced) return;
    const started = Date.now() - elapsed;
    const id = window.setInterval(() => {
      const e = Date.now() - started;
      if (e >= CARD_MS) go(1);
      else setElapsed(e);
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the card or pause state changes
  }, [i, paused, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <main id="main" className="flex min-h-0 flex-1 flex-col px-4 pb-4">
      <div className="flex gap-1 py-2" aria-hidden>
        {lesson.cards.map((_, n) => (
          <span key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full bg-primary"
              style={{ width: n < i ? "100%" : n === i ? `${reduced ? 100 : Math.min(100, (elapsed / CARD_MS) * 100)}%` : "0%" }}
            />
          </span>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {t("lesson.cardOf", { n: i + 1, total })}: {card.title}
      </p>
      <div
        className={cn("relative flex min-h-0 flex-1 select-none flex-col justify-end overflow-hidden rounded-3xl p-6", TONE_BG[card.tone])}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        <button type="button" aria-label={t("lesson.prev")} onClick={() => go(-1)} className="absolute inset-y-0 left-0 w-1/3" />
        <button type="button" aria-label={t("lesson.next")} onClick={() => go(1)} className="absolute inset-y-0 right-0 w-2/3" />
        <div key={i} className="pointer-events-none animate-rise">
          <span className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-white/50 dark:bg-black/20">
            <Icon name={card.icon} className="size-9" />
          </span>
          <p className="tnum text-caption font-semibold uppercase tracking-wide opacity-80">{t("lesson.cardOf", { n: i + 1, total })}</p>
          <h2 className="mt-1 font-display text-headline font-semibold leading-tight">{card.title}</h2>
          <p className="mt-3 text-title font-normal leading-relaxed">{card.body}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {!reduced && (
          <Button variant="ghost" size="icon" onClick={() => setPaused((p) => !p)} aria-label={paused ? t("lesson.play") : t("lesson.pause")}>
            {paused ? <Play className="size-5" aria-hidden /> : <Pause className="size-5" aria-hidden />}
          </Button>
        )}
        <p className="flex-1 text-caption text-muted-foreground">{t("lesson.tapHint")}</p>
        <Button onClick={() => go(1)}>{i === total - 1 ? t("lesson.quizTitle") : t("app.continue")}</Button>
      </div>
    </main>
  );
}

function Quiz({ lesson, onDone }: { lesson: LessonContent; onDone: (score: number) => void }) {
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const question = lesson.quiz[q];
  const last = q === lesson.quiz.length - 1;
  const right = picked === question.answerIndex;

  const check = () => {
    if (picked === null) return;
    setChecked(true);
    if (right) setScore((s) => s + 1);
  };
  const next = () => {
    if (last) return onDone(score);
    setQ((x) => x + 1);
    setPicked(null);
    setChecked(false);
  };

  return (
    <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
      <p className="tnum pt-3 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        {t("lesson.quizTitle")} · {t("lesson.question", { n: q + 1, total: lesson.quiz.length })}
      </p>
      <fieldset className="mt-2 flex-1">
        <legend className="font-display text-headline font-semibold leading-tight">{question.question}</legend>
        <div className="mt-5 space-y-3">
          {question.options.map((opt, n) => {
            const isAnswer = n === question.answerIndex;
            const chosen = picked === n;
            return (
              <label
                key={n}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 bg-card p-4 text-body font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  !checked && (chosen ? "border-primary bg-accent/40" : "border-border"),
                  checked && isAnswer && "border-positive bg-positive-soft",
                  checked && chosen && !isAnswer && "border-negative bg-negative-soft",
                  checked && !chosen && !isAnswer && "border-border opacity-70",
                )}
              >
                <input type="radio" name={`q${q}`} className="sr-only" checked={chosen} disabled={checked} onChange={() => setPicked(n)} />
                <span className="flex-1">{opt}</span>
                {checked && isAnswer && <CheckCircle2 className="size-5 text-positive" aria-label={t("lesson.correctAnswer")} />}
                {checked && chosen && !isAnswer && <XCircle className="size-5 text-negative" aria-label={t("lesson.yourAnswer")} />}
              </label>
            );
          })}
        </div>
      </fieldset>
      {checked && (
        <div role="status" className={cn("mt-4 rounded-2xl p-4", right ? "bg-positive-soft" : "bg-warning-soft")}>
          <p className={cn("text-body font-semibold", right ? "text-positive" : "text-warning")}>{right ? t("lesson.correct") : t("lesson.notQuite")}</p>
          <p className="mt-1 text-body">{question.explanation}</p>
        </div>
      )}
      <Button size="lg" className="mt-4" onClick={checked ? next : check} disabled={picked === null}>
        {!checked ? t("lesson.check") : last ? t("lesson.seeResults") : t("lesson.nextQuestion")}
      </Button>
    </main>
  );
}

function Result({ lesson, score, onReplay }: { lesson: LessonContent; score: number; onReplay: () => void }) {
  const { persona } = useAppState();
  const { data } = useResource<LessonsResponse>(`/api/lessons?p=${persona}`);
  const [saveError, setSaveError] = useState<string | null>(null);
  const sent = useRef(false);
  const sources = LESSON_SOURCES[lesson.id] ?? [];

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    api(`/api/lessons/${lesson.id}/complete`, { method: "POST", body: { score, total: lesson.quiz.length } })
      .then(() => invalidate("/api/lessons"))
      .catch((e) => setSaveError(e instanceof ApiClientError ? e.message : t("app.genericError")));
  }, [lesson.id, lesson.quiz.length, score]);

  return (
    <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
      <div role="status" className="flex flex-col items-center pt-8 text-center">
        <span className="flex size-20 animate-pop items-center justify-center rounded-full bg-positive-soft text-positive">
          <CheckCircle2 className="size-12" aria-hidden />
        </span>
        <h2 className="mt-4 font-display text-headline font-semibold">{t("lesson.resultTitle")}</h2>
        <p className="mt-1 text-body text-muted-foreground">{t("lesson.resultScore", { score, total: lesson.quiz.length })}</p>
        {data && data.streak > 0 && <p className="mt-1 text-body font-semibold text-warning">🔥 {t("lesson.resultStreak", { n: data.streak })}</p>}
        {saveError && (
          <p role="alert" className="mt-2 text-caption text-negative">
            {saveError}
          </p>
        )}
      </div>

      <div className="mt-8 space-y-2">
        <ButtonLink href={lesson.action.href} size="lg">
          {t("lesson.tryIt")}: {lesson.action.label}
        </ButtonLink>
        <ButtonLink href="/learn" variant="outline" className="w-full">
          {t("lesson.finish")}
        </ButtonLink>
        <Button variant="ghost" className="w-full" onClick={onReplay}>
          {t("lesson.replay")}
        </Button>
      </div>

      {sources.length > 0 && (
        <section aria-labelledby="sources" className="mt-8 rounded-2xl bg-secondary/60 p-4">
          <h3 id="sources" className="text-body font-semibold">
            {t("lesson.sources")}
          </h3>
          <ul className="mt-2 space-y-1">
            {sources.map((s) => (
              <li key={s.url}>
                <Link href={s.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-body text-primary underline-offset-4 hover:underline">
                  {s.label}
                  <ExternalLink className="size-3.5" aria-hidden />
                  <span className="sr-only">{t("lesson.opensNewTab")}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-muted-foreground">{t("lesson.notAdvice")}</p>
        </section>
      )}
    </main>
  );
}
