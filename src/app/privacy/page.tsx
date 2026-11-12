import type { Metadata } from "next";
import { Screen } from "@/components/shell/screen";
import { LegalSection } from "@/components/legal/legal-section";
import { t } from "@/i18n";

export const metadata: Metadata = { title: "Privacy Policy · Sprout" };

export default function PrivacyPage() {
  return (
    <Screen title={t("legal.privacyTitle")} back="/">
      <p className="mb-6 text-caption text-muted-foreground">{t("legal.updated")}</p>
      <LegalSection title="What we collect">
        Your email, a secure hash of your password (never the password itself), what you enter during setup and in Budget,
        your @username, the wallet address you connect, and your activity in the app such as lessons, practice trades and
        payments. We don&apos;t ask for your SSN, bank login or card numbers.
      </LegalSection>
      <LegalSection title="How we use it">
        Only to run Sprout for you: signing you in, showing your budget and progress, and sending or receiving test payments
        you ask for. We don&apos;t sell your data, show ads or use tracking or analytics tools.
      </LegalSection>
      <LegalSection title="Who else sees it">
        Your wallet provider (the Interledger test network) sees payments you make. Other Sprout members can find you only by
        your exact @username, which shows your name and wallet so they can pay you. If the AI coach is turned on, the question
        you ask is sent to Anthropic to write an answer. Our host (Vercel) and database provider (Upstash) store data for us.
      </LegalSection>
      <LegalSection title="How we protect it">
        Data is sent over HTTPS, sign-in uses a secure cookie, wallet permissions are stored on the server and never sent to
        your browser, and sign-in attempts are rate limited.
      </LegalSection>
      <LegalSection title="Your choices">
        You can disconnect your wallet or delete your account at any time in Profile. Deleting your account removes your
        account and app data from Sprout. Payments already made on the test network stay in those wallets&apos; history.
      </LegalSection>
      <LegalSection title="Age">Sprout is for people 18 and older. We don&apos;t knowingly collect data from children.</LegalSection>
    </Screen>
  );
}
