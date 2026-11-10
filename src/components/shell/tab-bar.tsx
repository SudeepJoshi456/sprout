"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, BookOpen, ChartLine, House, Wallet } from "lucide-react";
import { cn } from "@/lib/format";
import { t } from "@/i18n";

const TABS = [
  { href: "/home", label: "tabs.home", Icon: House },
  { href: "/budget", label: "tabs.budget", Icon: Wallet },
  { href: "/move", label: "tabs.move", Icon: ArrowLeftRight },
  { href: "/grow", label: "tabs.grow", Icon: ChartLine },
  { href: "/learn", label: "tabs.learn", Icon: BookOpen },
] as const;

/** Bottom tab bar: always visible, in the thumb zone, icons + labels. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label={t("tabs.label")} className="safe-bottom shrink-0 border-t border-border bg-card/95 backdrop-blur">
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-start gap-0.5 px-0.5 pt-1.5 text-center text-[11px] font-medium leading-[13px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-positive-soft")}>
                  <Icon className="size-[22px]" aria-hidden strokeWidth={active ? 2.4 : 2} />
                </span>
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
