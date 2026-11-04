"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { GLOSSARY_MAP } from "@/data/glossary";
import { LESSON_META } from "@/data/lessons";
import { t } from "@/i18n";
import { Sheet } from "./sheet";

/**
 * A tappable finance term. Opens a plain-language definition.
 * Usage: <Term id="etf">ETF</Term>
 */
export function Term({ id, children }: { id: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY_MAP[id];
  if (!entry) return <>{children}</>;
  const lesson = entry.lessonId ? LESSON_META.find((l) => l.id === entry.lessonId) : null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-label={t("terms.tapToDefine", { term: entry.term })}
        className="cursor-help underline decoration-dotted decoration-2 underline-offset-4 hover:decoration-primary"
      >
        {children}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={entry.term}>
        <TermBody id={id} />
        {lesson && (
          <Link
            href={`/learn/${lesson.id}`}
            className="mt-4 flex min-h-12 items-center gap-3 rounded-xl bg-secondary px-4 text-body font-semibold"
            onClick={() => setOpen(false)}
          >
            <BookOpen className="size-5 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-caption font-medium text-muted-foreground">{t("terms.relatedLesson")}</span>
              {lesson.title}
            </span>
          </Link>
        )}
      </Sheet>
    </>
  );
}

export function TermBody({ id }: { id: string }) {
  const entry = GLOSSARY_MAP[id];
  if (!entry) return null;
  return (
    <div className="space-y-3">
      <p className="text-body leading-relaxed">{entry.definition}</p>
      {entry.newcomer && (
        <div className="rounded-xl bg-info-soft p-3 text-body text-info">
          <p className="text-caption font-semibold uppercase tracking-wide">{t("learn.forNewcomers")}</p>
          <p className="mt-1">{entry.newcomer}</p>
        </div>
      )}
    </div>
  );
}
