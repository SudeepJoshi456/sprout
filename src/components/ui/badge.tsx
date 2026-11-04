import { FlaskConical, Sprout } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { t } from "@/i18n";

type Tone = "neutral" | "positive" | "negative" | "warning" | "info" | "practice" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-negative",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  practice: "bg-practice-soft text-practice",
  accent: "bg-accent text-accent-foreground",
};

export function Badge({ tone = "neutral", children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold", tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

/** Always-visible label for anything simulated. */
export function SimulatedBadge({ className, label }: { className?: string; label?: string }) {
  return (
    <Badge tone="practice" className={className} icon={<FlaskConical className="size-3.5" aria-hidden />}>
      {label ?? t("app.simulated")}
    </Badge>
  );
}

export function PracticeBadge({ className }: { className?: string }) {
  return (
    <Badge tone="practice" className={className} icon={<Sprout className="size-3.5" aria-hidden />}>
      {t("app.practice")}
    </Badge>
  );
}
