"use client";

import { Delete } from "lucide-react";
import { useEffect } from "react";
import { cn, formatMoney } from "@/lib/format";

/**
 * Amount entry: a big display plus an on-screen keypad (thumb zone) and quick
 * chips. Physical keyboards work too. `value` is a digits string in dollars,
 * e.g. "950" or "12.5".
 */
export function amountToCents(value: string) {
  if (!value || value === ".") return 0;
  return Math.round(parseFloat(value) * 100);
}

function press(value: string, key: string, maxCents: number) {
  if (key === "back") return value.slice(0, -1);
  if (key === ".") return value.includes(".") ? value : (value || "0") + ".";
  const [, dec] = value.split(".");
  if (dec !== undefined && dec.length >= 2) return value;
  const next = value === "0" ? key : value + key;
  if (amountToCents(next) > maxCents) return value;
  return next;
}

export function AmountDisplay({ value, label, currency = "USD", sub }: { value: string; label: string; currency?: string; sub?: React.ReactNode }) {
  const cents = amountToCents(value);
  // Show what's being typed (e.g. "12." stays visible) while formatting the whole part.
  const [whole, dec] = value.split(".");
  const formattedWhole = formatMoney((Number(whole) || 0) * 100, { currency, trimZeroCents: true });
  const display = value === "" ? formatMoney(0, { currency, trimZeroCents: true }) : dec !== undefined ? `${formattedWhole}.${dec}` : formattedWhole;
  return (
    <div className="py-4 text-center">
      <p className="sr-only" aria-live="polite">
        {label}: {formatMoney(cents, { currency })}
      </p>
      <p aria-hidden className={cn("tnum font-display text-[3rem] font-semibold leading-none tracking-tight", cents === 0 && "text-muted-foreground")}>
        {display}
      </p>
      {sub && <div className="mt-2 text-body text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Keypad({
  value,
  onChange,
  maxCents = 100_000_000,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  maxCents?: number;
  label: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (/^[0-9]$/.test(e.key)) onChange(press(value, e.key, maxCents));
      else if (e.key === "." || e.key === ",") onChange(press(value, ".", maxCents));
      else if (e.key === "Backspace") onChange(press(value, "back", maxCents));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, onChange, maxCents]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
  return (
    <div role="group" aria-label={label} className="grid grid-cols-3 gap-2">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(press(value, k, maxCents))}
          aria-label={k === "back" ? "Delete" : k === "." ? "Decimal point" : k}
          className="flex h-13 items-center justify-center rounded-xl text-headline font-semibold text-foreground transition-colors hover:bg-muted active:bg-muted"
        >
          {k === "back" ? <Delete className="size-6" aria-hidden /> : k}
        </button>
      ))}
    </div>
  );
}

export function QuickChips({ amounts, onPick, format = (n: number) => formatMoney(n * 100, { trimZeroCents: true }) }: { amounts: number[]; onPick: (n: number) => void; format?: (n: number) => string }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {amounts.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onPick(a)}
          className="min-h-11 rounded-full border border-input bg-card px-4 text-body font-semibold hover:bg-muted"
        >
          {format(a)}
        </button>
      ))}
    </div>
  );
}
