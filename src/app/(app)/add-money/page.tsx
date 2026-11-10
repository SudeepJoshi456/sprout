"use client";

import { ExternalLink } from "lucide-react";
import { Screen } from "@/components/shell/screen";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { useAppState } from "@/lib/client/hooks";
import { t } from "@/i18n";

/** ★ Add money: money stays in the person's own wallet, so this explains how to top it up there. */
export default function AddMoneyPage() {
  const { wallet } = useAppState();
  const steps = [
    { title: t("bank.step1"), body: t("bank.step1Body", { wallet: wallet ? wallet.url.replace(/^https:\/\//, "") : "your wallet" }) },
    { title: t("bank.step2"), body: t("bank.step2Body") },
    { title: t("bank.step3"), body: t("bank.step3Body") },
  ];
  return (
    <Screen title={t("bank.title")} back="/home">
      <p className="mb-4 text-body text-muted-foreground">{t("bank.intro")}</p>
      <Card className="p-5">
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-caption font-bold text-primary">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-body font-semibold">{s.title}</span>
                <span className="block text-body text-muted-foreground">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <div className="mt-6 space-y-2">
        {wallet ? (
          <a
            href="https://wallet.interledger-test.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-body font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("bank.openWallet")}
            <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : (
          <ButtonLink href="/profile" size="lg">
            {t("bank.noWallet")}
          </ButtonLink>
        )}
        <ButtonLink href="/home" size="lg" variant="ghost">
          {t("bank.goHome")}
        </ButtonLink>
      </div>
    </Screen>
  );
}
