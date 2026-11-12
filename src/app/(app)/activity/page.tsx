"use client";

import { Screen } from "@/components/shell/screen";
import { WalletActivityCard } from "@/components/money/wallet-activity";
import { t } from "@/i18n";

/** Every payment in and out of the connected wallet (the 50 most recent the wallet returns). */
export default function ActivityPage() {
  return (
    <Screen title={t("wallet.allActivityTitle")} back="/home">
      <WalletActivityCard limit={50} seeAll={false} />
    </Screen>
  );
}
