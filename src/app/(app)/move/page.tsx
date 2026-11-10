"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { Screen } from "@/components/shell/screen";
import { Segmented } from "@/components/ui/segmented";
import { SendFlow } from "@/components/move/send-flow";
import { ReceivePanel, RequestPanel } from "@/components/move/receive-panels";
import { InterledgerSheet } from "@/components/move/payment-trace";
import { useAppState } from "@/lib/client/hooks";
import { t } from "@/i18n";

type Tab = "send" | "receive" | "request";

/** ★ Send & Receive: pay people, get paid, and request money (Interledger / Open Payments underneath). */
export default function MovePage() {
  return (
    <Suspense>
      <Move />
    </Suspense>
  );
}

function Move() {
  const { modes } = useAppState();
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("tab");
  const [tab, setTab] = useState<Tab>(initial === "receive" || initial === "request" ? initial : "send");
  const [infoOpen, setInfoOpen] = useState(false);
  const [flowKey, setFlowKey] = useState(0);

  const changeTab = (next: Tab) => {
    setTab(next);
    if (next === "send") setFlowKey((k) => k + 1);
    router.replace(next === "send" ? "/move" : `/move?tab=${next}`, { scroll: false });
  };

  return (
    <Screen
      title={t("move.title")}
      actions={
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label={t("move.howInfo")}
          className="inline-flex size-11 items-center justify-center rounded-full text-primary hover:bg-muted"
        >
          <Info className="size-5" aria-hidden />
        </button>
      }
      banner={
        <div className="px-4 pb-3">
          <Segmented<Tab>
            label={t("move.modeTabs")}
            value={tab}
            onChange={changeTab}
            controls="move"
            options={[
              { value: "send", label: t("move.send") },
              { value: "receive", label: t("move.receive") },
              { value: "request", label: t("move.request") },
            ]}
          />
        </div>
      }
    >
      <div role="tabpanel" id={`move-panel-${tab}`} aria-labelledby={`move-tab-${tab}`} className="min-h-full">
        {tab === "send" && <SendFlow key={flowKey} />}
        {tab === "receive" && <ReceivePanel />}
        {tab === "request" && <RequestPanel />}
      </div>
      <InterledgerSheet open={infoOpen} onOpenChange={setInfoOpen} mode={modes.payments} />
    </Screen>
  );
}
