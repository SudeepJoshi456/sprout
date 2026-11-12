import type { Metadata } from "next";
import { Screen } from "@/components/shell/screen";
import { LegalSection } from "@/components/legal/legal-section";
import { t } from "@/i18n";

export const metadata: Metadata = { title: "Terms of Use · Sprout" };

export default function TermsPage() {
  return (
    <Screen title={t("legal.termsTitle")} back="/">
      <p className="mb-6 text-caption text-muted-foreground">{t("legal.updated")}</p>
      <LegalSection title="What Sprout is">
        Sprout is a student prototype built to teach money basics. It is not a bank, money transmitter, broker or financial
        adviser, and it does not hold your money. Lessons, budgets and the coach are educational only and are not financial,
        legal or tax advice.
      </LegalSection>
      <LegalSection title="Test money only">
        Payments run on the Interledger test network (interledger-test.dev) with play money. No real money moves, nothing is
        FDIC insured, and test balances have no cash value. Practice investing uses simulated trades with market data that may
        be delayed. Past or simulated results don&apos;t promise future returns.
      </LegalSection>
      <LegalSection title="Who can use it">
        You must be 18 or older. Keep your password private; you&apos;re responsible for activity on your account.
      </LegalSection>
      <LegalSection title="Your wallet, your approval">
        Sprout can only send from a wallet you connect yourself. Your wallet asks you to approve Sprout with a spending limit,
        and every payment is shown for review before it&apos;s sent. You can disconnect your wallet at any time in Profile,
        which cancels Sprout&apos;s permission.
      </LegalSection>
      <LegalSection title="Fair use">
        Don&apos;t use Sprout to break the law, to send payments you aren&apos;t allowed to send, or to try to access other
        people&apos;s accounts. We may suspend accounts that do.
      </LegalSection>
      <LegalSection title="No warranty">
        Sprout is provided as is, for learning and demonstration. It may change, have errors or be unavailable, and we may
        reset test data.
      </LegalSection>
      <LegalSection title="Ending your account">
        You can delete your account at any time in Profile. That removes your account and app data from Sprout.
      </LegalSection>
    </Screen>
  );
}
