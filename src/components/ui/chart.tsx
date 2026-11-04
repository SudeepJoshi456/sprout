"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn, formatPercent } from "@/lib/format";
import type { PricePoint } from "@/lib/types";

/**
 * Lightweight SVG line chart (no chart library, keeps the bundle small).
 * - Scrub with pointer/touch, or focus and use arrow keys.
 * - Summarized for screen readers; the scrubbed value is announced.
 * - Up/down is conveyed by text in the summary, not just line color.
 */
export function LineChart({
  points,
  label,
  formatValue,
  formatTime,
  height = 160,
  className,
}: {
  points: PricePoint[];
  label: string;
  formatValue: (v: number) => string;
  formatTime: (t: number) => string;
  height?: number;
  className?: string;
}) {
  const width = 340;
  const pad = 6;
  const gradId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const { path, area, xs, ys, min, max } = useMemo(() => {
    const vals = points.map((p) => p.c);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || Math.max(1, Math.abs(max) * 0.01);
    const xs = points.map((_, i) => pad + (i / Math.max(1, points.length - 1)) * (width - pad * 2));
    const ys = points.map((p) => pad + (1 - (p.c - min) / span) * (height - pad * 2));
    const path = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const area = `${path} L${xs.at(-1)?.toFixed(1)},${height} L${xs[0]?.toFixed(1)},${height} Z`;
    return { path, area, xs, ys, min, max };
  }, [points, height]);

  if (points.length < 2) {
    return <div className={cn("flex items-center justify-center text-caption text-muted-foreground", className)} style={{ height }} />;
  }

  const first = points[0].c;
  const last = points[points.length - 1].c;
  const up = last >= first;
  const color = up ? "var(--positive)" : "var(--negative)";
  const changePct = first ? ((last - first) / first) * 100 : 0;
  const summary = `${label}: ${up ? "up" : "down"} ${formatPercent(changePct, { signed: false })}, from ${formatValue(first)} to ${formatValue(last)}. Lowest ${formatValue(min)}, highest ${formatValue(max)}.`;
  const idx = active ?? points.length - 1;

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i;
    setActive(best);
  };

  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowLeft") setActive(Math.max(0, idx - step));
    else if (e.key === "ArrowRight") setActive(Math.min(points.length - 1, idx + step));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(points.length - 1);
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  return (
    <figure className={cn("relative", className)}>
      <figcaption className="sr-only">{summary}</figcaption>
      <div className="mb-1 flex h-5 items-baseline justify-between text-caption text-muted-foreground" aria-live="polite">
        {active !== null ? (
          <>
            <span className="tnum font-semibold text-foreground">{formatValue(points[idx].c)}</span>
            <span>{formatTime(points[idx].t)}</span>
          </>
        ) : null}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block w-full touch-pan-y rounded-lg focus-visible:outline-2"
        style={{ height }}
        role="slider"
        tabIndex={0}
        aria-label={`${label}. Use arrow keys to explore values.`}
        aria-valuemin={0}
        aria-valuemax={points.length - 1}
        aria-valuenow={idx}
        aria-valuetext={`${formatValue(points[idx].c)} on ${formatTime(points[idx].t)}`}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={0} x2={width} y1={ys[0]} y2={ys[0]} stroke="var(--border)" strokeDasharray="3 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={area} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {active !== null && (
          <>
            <line x1={xs[idx]} x2={xs[idx]} y1={0} y2={height} stroke="var(--muted-foreground)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <circle cx={xs[idx]} cy={ys[idx]} r={4} fill={color} stroke="var(--card)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
    </figure>
  );
}
