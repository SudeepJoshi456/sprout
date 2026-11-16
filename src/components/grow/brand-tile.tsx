import { Check } from "lucide-react";
import { BRAND_MAP, BRANDS, type Brand } from "@/data/brands";
import { cn } from "@/lib/format";

/** A brand's colored monogram. No trademarked logos: just the first letter on its color. */
export function BrandMark({ brand, size = "md", className }: { brand: Brand; size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = size === "sm" ? "size-9 text-body" : size === "lg" ? "size-14 text-title" : "size-11 text-title";
  return (
    <span
      aria-hidden
      style={{ backgroundColor: brand.color }}
      className={cn("flex shrink-0 items-center justify-center rounded-2xl font-display font-semibold text-white", dims, className)}
    >
      {brand.name.charAt(0)}
    </span>
  );
}

export function BrandMarkFor({ symbol, size, className }: { symbol: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const brand = BRAND_MAP[symbol];
  return brand ? <BrandMark brand={brand} size={size} className={className} /> : null;
}

/** Grid of brands to pick from. Each tile is a toggle button. */
export function BrandPicker({ selected, onChange, label }: { selected: string[]; onChange: (next: string[]) => void; label: string }) {
  const toggle = (symbol: string) =>
    onChange(selected.includes(symbol) ? selected.filter((s) => s !== symbol) : [...selected, symbol]);
  return (
    <ul className="grid grid-cols-2 gap-2.5" aria-label={label}>
      {BRANDS.map((b) => {
        const on = selected.includes(b.symbol);
        return (
          <li key={b.symbol}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => toggle(b.symbol)}
              className={cn(
                "relative flex min-h-16 w-full items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition-colors",
                on ? "border-primary bg-accent/40" : "border-border hover:bg-muted",
              )}
            >
              <BrandMark brand={b} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold">{b.name}</span>
                <span className="block truncate text-caption text-muted-foreground">{b.known}</span>
              </span>
              {on && (
                <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3.5" aria-hidden />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
