"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { BrandMarkFor } from "@/components/grow/brand-tile";
import { Button } from "@/components/ui/button";
import { BRAND_MAP } from "@/data/brands";
import { api } from "@/lib/client/api";
import { useAppState } from "@/lib/client/hooks";
import { formatMoney } from "@/lib/format";
import { t } from "@/i18n";

/** Home: stock gifts from friends that haven't been opened yet. */
export function GiftsReceived() {
  const { user } = useAppState();
  const unseen = (user.gifts ?? []).filter((g) => !g.seen).slice(0, 2);
  if (unseen.length === 0) return null;
  const markSeen = (id: string) => api(`/api/gifts/${encodeURIComponent(id)}`, { method: "PATCH" }).catch(() => undefined);
  return (
    <div className="space-y-3">
      {unseen.map((g) => {
        const brand = BRAND_MAP[g.symbol]?.name ?? g.symbol;
        const from = g.fromName.replace(/ \(@[^)]+\)$/, "");
        return (
          <section key={g.id} aria-label={t("gift.receivedTitle", { from, amount: formatMoney(g.amountCents), brand })} className="animate-rise rounded-2xl border border-primary/30 bg-accent/40 p-4">
            <Link href={`/grow/${g.symbol}`} onClick={() => markSeen(g.id)} className="flex items-start gap-3">
              <span className="relative">
                <BrandMarkFor symbol={g.symbol} />
                <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Gift className="size-3.5" aria-hidden />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold">{t("gift.receivedTitle", { from, amount: formatMoney(g.amountCents), brand })}</span>
                {g.message && <span className="mt-1 block text-body">“{g.message}”</span>}
                <span className="mt-1 block text-caption text-foreground/80">{t("gift.receivedBody")}</span>
              </span>
            </Link>
            <div className="mt-2 flex justify-end">
              <Button variant="ghost" onClick={() => markSeen(g.id)}>
                {t("gift.dismiss")}
              </Button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
