import { cn } from "@/lib/format";

type Tone = "positive" | "warning" | "negative" | "practice" | "info";

const fills: Record<Tone, string> = {
  positive: "bg-positive",
  warning: "bg-warning",
  negative: "bg-negative",
  practice: "bg-practice",
  info: "bg-info",
};

/**
 * Progress bar with an accessible name. Color is never the only signal:
 * callers always render a text status next to it.
 */
export function ProgressBar({
  value,
  label,
  tone = "positive",
  className,
  valueText,
}: {
  value: number; // 0..1 (values > 1 are clamped visually)
  label: string;
  tone?: Tone;
  className?: string;
  valueText?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={valueText}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", fills[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Small ring for budget summaries. Decorative; the text next to it carries the meaning. */
export function Ring({ value, size = 56, tone = "positive" }: { value: number; size?: number; tone?: Tone }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const color = { positive: "var(--positive)", warning: "var(--warning)", negative: "var(--negative)", practice: "var(--practice)", info: "var(--info)" }[tone];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        className="transition-[stroke-dasharray] duration-700"
      />
    </svg>
  );
}
