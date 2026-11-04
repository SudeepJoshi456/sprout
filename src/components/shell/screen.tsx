"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { t } from "@/i18n";

/**
 * A screen: sticky header + the scrollable main region.
 * `id="main"` is the skip-link target.
 */
export function Screen({
  title,
  back,
  actions,
  children,
  className,
  banner,
  hideTitle,
  footer,
}: {
  title: string;
  /** true = router.back(), string = link target */
  back?: boolean | string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Persistent strip under the header (e.g. the practice-mode notice). */
  banner?: ReactNode;
  hideTitle?: boolean;
  /** Pinned bottom area for the primary action (thumb zone). */
  footer?: ReactNode;
}) {
  const router = useRouter();
  return (
    <>
      <header className="safe-top z-20 shrink-0 bg-background/95 backdrop-blur">
        <div className="flex min-h-14 items-center gap-1 px-2">
          {back ? (
            <button
              type="button"
              onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted"
              aria-label={t("app.back")}
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
          ) : (
            <span className="w-3" />
          )}
          <h1 className={cn("min-w-0 flex-1 truncate font-display text-headline font-semibold", back && "text-title", hideTitle && "sr-only")}>
            {title}
          </h1>
          {actions && <div className="flex items-center gap-1 pr-1">{actions}</div>}
        </div>
        {banner}
      </header>
      <main id="main" tabIndex={-1} className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 outline-none", className)}>
        {children}
      </main>
      {footer && <div className="safe-bottom shrink-0 border-t border-border/60 bg-background px-4 pt-3">{footer}</div>}
    </>
  );
}
