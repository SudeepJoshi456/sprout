"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { t } from "@/i18n";
import { useFrame } from "@/components/shell/frame-context";

/**
 * Bottom sheet built on Radix Dialog (focus trap, Escape, aria-modal).
 * Portals into the phone frame so it stays inside the device on desktop.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  hideTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  hideTitle?: boolean;
}) {
  const frame = useFrame();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={frame ?? undefined}>
        <Dialog.Overlay className="absolute inset-0 z-40 bg-black/40 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
        <Dialog.Content
          className={cn(
            "absolute inset-x-0 bottom-0 z-50 flex max-h-[88%] flex-col rounded-t-3xl border-t border-border bg-card text-card-foreground shadow-raised outline-none data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in",
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-muted" aria-hidden />
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
            <div className="min-w-0">
              <Dialog.Title className={cn("font-display text-title font-semibold", hideTitle && "sr-only")}>{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-body text-muted-foreground">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label={t("app.close")}
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer && <div className="safe-bottom border-t border-border/60 px-5 pt-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
