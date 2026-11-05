import Image from "next/image";
import { cn } from "@/lib/format";
import mark from "../../../public/logo-mark.png";

/** Sprout mark: the seedling-and-coin logo. Same artwork as the app icons in /public. */
export function SproutMark({ className }: { className?: string }) {
  return <Image src={mark} alt="" aria-hidden sizes="64px" className={cn("size-8 rounded-lg object-cover", className)} />;
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SproutMark />
      <span className="font-display text-title font-semibold tracking-tight">Sprout</span>
    </span>
  );
}
