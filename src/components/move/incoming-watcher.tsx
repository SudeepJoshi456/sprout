"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/api";
import { useClientState } from "@/lib/client/hooks";
import { formatMoney } from "@/lib/format";
import type { Transfer } from "@/lib/types";
import { t } from "@/i18n";

const POLL_MS = 6000;

/**
 * Live mode only: polls the user's real wallet for money that arrived over
 * Interledger. The server credits new amounts and returns them; we announce
 * each one. Pauses while the tab is hidden.
 */
export function IncomingWatcher() {
  const live = useClientState()?.modes.receiving === "interledger";

  useEffect(() => {
    if (!live) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await api<{ received: Transfer[] }>("/api/payments/incoming", { method: "POST" });
          for (const tr of res.received ?? []) {
            toast.success(t("move.incomingToast", { amount: formatMoney(tr.debit.value) }), { description: tr.counterpartyName });
          }
        } catch {
          /* network hiccup; try again next tick */
        }
      }
      timer = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [live]);

  return null;
}
