"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/format";

/**
 * Segmented control implemented as an ARIA tablist (or radiogroup) with
 * roving focus and arrow-key support.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  role = "tablist",
  controls,
  dense,
}: {
  /** Smaller text for 4+ options on a phone. */
  dense?: boolean;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  role?: "tablist" | "radiogroup";
  /** id prefix of tab panels, for aria-controls */
  controls?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next].value);
  };
  const itemRole = role === "tablist" ? "tab" : "radio";
  return (
    <div role={role} aria-label={label} className={cn("flex rounded-xl bg-muted p-1", className)}>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role={itemRole}
            id={controls ? `${controls}-tab-${o.value}` : undefined}
            aria-controls={controls ? `${controls}-panel-${o.value}` : undefined}
            aria-selected={role === "tablist" ? active : undefined}
            aria-checked={role === "radiogroup" ? active : undefined}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "min-h-10 min-w-0 flex-1 rounded-lg font-semibold transition-colors duration-150",
              dense ? "truncate px-1 text-caption" : "px-3 text-body",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
