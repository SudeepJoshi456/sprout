import { cn, initials } from "@/lib/format";

const COLORS = ["bg-[#137d41] text-white", "bg-[#2c94b0] text-white", "bg-[#8a5a00] text-white", "bg-[#5b3fa0] text-white", "bg-[#b42b2f] text-white"];

/** Initials avatar; color is derived from the name so it's stable. */
export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const hash = Array.from(name).reduce((h, c) => (h * 31 + c.codePointAt(0)!) | 0, 7);
  const color = COLORS[Math.abs(hash) % COLORS.length];
  const dims = { sm: "size-9 text-caption", md: "size-11 text-body", lg: "size-14 text-title" }[size];
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", dims, color, className)}>
      {initials(name)}
    </span>
  );
}
