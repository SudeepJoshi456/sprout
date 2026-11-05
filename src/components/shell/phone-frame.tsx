"use client";

import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";
import { t } from "@/i18n";
import { FrameContext } from "./frame-context";

/**
 * Mobile: the app fills the screen.
 * Tablet/desktop: a centered phone-sized frame (like the original design).
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  const { resolvedTheme } = useTheme();
  return (
    <div className="flex min-h-dvh w-full items-stretch justify-center bg-frame sm:items-center sm:px-6 sm:py-6">
      <div
        ref={setFrame}
        className="safe-top relative flex h-dvh w-full flex-col overflow-hidden bg-background sm:h-[min(880px,calc(100dvh-3rem))] sm:max-w-[420px] sm:rounded-[2.5rem] sm:border sm:border-border sm:shadow-raised"
      >
        <a
          href="#main"
          className="absolute left-3 top-3 z-[60] -translate-y-20 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:translate-y-0"
        >
          {t("app.skipToContent")}
        </a>
        <FrameContext.Provider value={frame}>{children}</FrameContext.Provider>
        <Toaster
          position="top-center"
          theme={(resolvedTheme as "light" | "dark") ?? "system"}
          className="sprout-toaster"
          toastOptions={{ classNames: { toast: "!rounded-2xl !font-sans !text-body" } }}
        />
      </div>
    </div>
  );
}
