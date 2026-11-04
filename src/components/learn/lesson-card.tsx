import Link from "next/link";
import { CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/format";
import type { LessonSummary } from "@/lib/types";
import { t } from "@/i18n";

const TRACK_STYLE: Record<LessonSummary["track"], string> = {
  newcomer: "bg-info-soft text-info",
  credit: "bg-warning-soft text-warning",
  investing: "bg-positive-soft text-positive",
  money: "bg-practice-soft text-practice",
};

export function LessonCard({ lesson, featured, className }: { lesson: LessonSummary; featured?: boolean; className?: string }) {
  return (
    <Link
      href={`/learn/${lesson.id}`}
      className={cn(
        "group flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-colors hover:border-primary",
        featured && "p-5",
        className,
      )}
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", TRACK_STYLE[lesson.track])}>
        {lesson.completed ? <CheckCircle2 className="size-6" aria-hidden /> : <PlayCircle className="size-6" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block font-semibold leading-snug", featured ? "text-title" : "text-body")}>{lesson.title}</span>
        {featured && <span className="mt-1 block text-body text-muted-foreground">{lesson.summary}</span>}
        <span className="mt-2 flex flex-wrap items-center gap-2">
          <Badge icon={<Clock className="size-3.5" aria-hidden />}>{t("learn.minutes", { n: lesson.minutes })}</Badge>
          {lesson.completed && <Badge tone="positive">{t("learn.done")}</Badge>}
          {lesson.reason && !lesson.completed && <span className="text-caption text-muted-foreground">{lesson.reason}</span>}
        </span>
      </span>
    </Link>
  );
}
