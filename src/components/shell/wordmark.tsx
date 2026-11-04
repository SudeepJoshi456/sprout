import { cn } from "@/lib/format";

/** Sprout mark: a seedling in the brand green. Matches /public/icon.svg. */
export function SproutMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#137d41" />
      <path d="M32 50V31" stroke="#f7faf2" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M32.5 32c0-8.5 6.2-14.5 15.5-14.5 0 9.3-6.4 15.4-15.5 14.5z" fill="#e5e75b" />
      <path d="M31.5 37c0-7.4-5.4-12.6-13.5-12.6 0 8.1 5.6 13.4 13.5 12.6z" fill="#f7faf2" />
      <path d="M21 50h22" stroke="#f7faf2" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SproutMark />
      <span className="font-display text-title font-semibold tracking-tight">Sprout</span>
    </span>
  );
}
