"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, BookOpen, Sparkles } from "lucide-react";
import { Screen } from "@/components/shell/screen";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/client/api";
import { useAppState } from "@/lib/client/hooks";
import { BRAND_MAP } from "@/data/brands";
import { LESSON_META } from "@/data/lessons";
import { cn } from "@/lib/format";
import { t } from "@/i18n";

interface Msg {
  role: "user" | "assistant";
  text: string;
  lessonId?: string | null;
}

const STORE = "sprout.coach.v1";
/** Only the last few turns go to the server, to keep answers focused and requests small. */
const SEND_TURNS = 8;

/** ★ Coach: ask any money question; it explains, it doesn't advise. */
export default function CoachPage() {
  const { user } = useAppState();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // The chat stays in this browser tab only; the server keeps nothing.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount
      if (saved) setMsgs(JSON.parse(saved));
    } catch {
      /* start fresh */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* not critical */
    }
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [msgs]);

  const firstBrand = user.profile.brands.map((s) => BRAND_MAP[s]).find(Boolean);
  const suggestions = [
    t("coach.suggestStock"),
    firstBrand ? t("coach.suggestBrand", { brand: firstBrand.name }) : t("coach.suggestRisk"),
    t("coach.suggestIndex"),
    t("coach.suggestStart"),
  ];

  const ask = async (text: string) => {
    const q = text.trim().slice(0, 600);
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", text: q }];
    setMsgs(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ answer: { reply: string; lessonId: string | null } }>("/api/coach/chat", {
        method: "POST",
        body: { messages: next.slice(-SEND_TURNS).map(({ role, text }) => ({ role, text })) },
      });
      setMsgs([...next, { role: "assistant", text: res.answer.reply, lessonId: res.answer.lessonId }]);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : t("app.genericError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={t("coach.title")}
      actions={
        msgs.length > 0 && (
          <Button variant="ghost" onClick={() => setMsgs([])}>
            {t("coach.clear")}
          </Button>
        )
      }
      footer={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(draft);
          }}
          className="flex items-end gap-2"
        >
          <label htmlFor="coach-input" className="sr-only">
            {t("coach.inputLabel")}
          </label>
          <textarea
            id="coach-input"
            rows={1}
            maxLength={600}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(draft);
              }
            }}
            placeholder={t("coach.placeholder")}
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-input bg-card px-4 py-3 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Button type="submit" size="lg" className="size-12 shrink-0 rounded-full p-0" disabled={!draft.trim() || busy} aria-label={t("coach.send")}>
            <ArrowUp className="size-5" aria-hidden />
          </Button>
        </form>
      }
    >
      <div className="space-y-3 pb-2 pt-3">
        {msgs.length === 0 && (
          <section aria-labelledby="coach-intro" className="rounded-2xl bg-accent/40 p-4">
            <h2 id="coach-intro" className="flex items-center gap-2 font-display text-title font-semibold">
              <Sparkles className="size-5 text-primary" aria-hidden />
              {t("coach.introTitle")}
            </h2>
            <p className="mt-1 text-body">{t("coach.introBody")}</p>
            <ul className="mt-3 space-y-2" aria-label={t("coach.suggestions")}>
              {suggestions.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => ask(s)} className="min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-body hover:border-primary">
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ol className="space-y-3" aria-live="polite" aria-label={t("coach.conversation")}>
          {msgs.map((m, i) => (
            <li key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-body", m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border/70 bg-card")}>
                <span className="sr-only">{m.role === "user" ? t("coach.you") : t("coach.title")}: </span>
                {m.text}
                {m.lessonId && LESSON_META.some((l) => l.id === m.lessonId) && (
                  <Link href={`/learn/${m.lessonId}`} className="mt-2 flex min-h-11 items-center gap-1.5 text-body font-semibold text-primary">
                    <BookOpen className="size-4" aria-hidden />
                    {LESSON_META.find((l) => l.id === m.lessonId)!.title}
                  </Link>
                )}
              </div>
            </li>
          ))}
          {busy && (
            <li className="flex justify-start">
              <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-body text-muted-foreground">{t("coach.thinking")}</div>
            </li>
          )}
        </ol>
        {error && (
          <p role="alert" className="rounded-xl bg-negative-soft p-3 text-body text-negative">
            {error}
          </p>
        )}
        <p className="text-center text-caption text-muted-foreground">{t("coach.disclaimer")}</p>
        <div ref={endRef} />
      </div>
    </Screen>
  );
}
