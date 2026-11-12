"use client";

import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/format";

interface FieldProps extends ComponentProps<"input"> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  trailing?: ReactNode;
  /** Fixed text or icon before the input, e.g. a URL prefix. */
  leading?: ReactNode;
  labelHidden?: boolean;
}

/**
 * Labeled text input. Errors are announced and linked via aria-describedby,
 * and the user's input is never cleared on error.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, trailing, leading, labelHidden, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errId = `${inputId}-err`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={inputId} className={cn("block text-body font-medium", labelHidden && "sr-only")}>
        {label}
      </label>
      <div
        className={cn(
          "flex min-h-12 items-center rounded-xl border bg-card px-3.5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
          error ? "border-negative" : "border-input",
        )}
      >
        {leading}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 bg-transparent py-3 text-body text-foreground outline-none placeholder:text-muted-foreground/80"
          {...props}
        />
        {trailing}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="flex items-start gap-1.5 text-caption font-medium text-negative">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
});
