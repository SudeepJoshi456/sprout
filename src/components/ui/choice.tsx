"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

/**
 * Large selectable card backed by a real checkbox/radio input, so keyboard,
 * screen readers, and form semantics work natively. Selection is shown by
 * border, fill, and a check mark: never color alone.
 */
export function ChoiceCard({
  type,
  name,
  checked,
  onChange,
  title,
  hint,
  icon,
}: {
  type: "checkbox" | "radio";
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 bg-card p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
        checked ? "border-primary bg-accent/40" : "border-border hover:border-input",
      )}
    >
      <input type={type} name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {icon && (
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", checked ? "bg-primary text-primary-foreground" : "bg-secondary text-primary")}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold">{title}</span>
        {hint && <span className="mt-0.5 block text-caption text-muted-foreground">{hint}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center border-2 transition-colors",
          type === "radio" ? "rounded-full" : "rounded-md",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
        )}
      >
        {checked && <Check className="size-4" strokeWidth={3} />}
      </span>
    </label>
  );
}
