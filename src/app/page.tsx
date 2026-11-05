import Image from "next/image";
import { ArrowLeftRight, IdCard, LineChart } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Wordmark } from "@/components/shell/wordmark";
import { t } from "@/i18n";
import hero from "../../public/logo.webp";

/** ★ Welcome: static, so it's the fastest first paint in the app. */
export default function Welcome() {
  const benefits = [
    { Icon: IdCard, text: t("welcome.benefitId") },
    { Icon: ArrowLeftRight, text: t("welcome.benefitMove") },
    { Icon: LineChart, text: t("welcome.benefitPractice") },
  ];
  return (
    <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-8">
      <Wordmark />
      <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative aspect-[802/828] w-full max-w-[220px] overflow-hidden rounded-2xl shadow-card">
          <Image src={hero} alt={t("welcome.heroAlt")} priority placeholder="blur" sizes="220px" className="object-cover" fill />
        </div>
        <h1 className="mt-6 text-balance font-display text-display font-semibold">{t("welcome.headline")}</h1>
        <p className="mt-3 max-w-xs text-pretty text-body text-muted-foreground">{t("welcome.sub")}</p>
      </div>
      <ul className="my-6 space-y-3">
        {benefits.map(({ Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-body font-medium">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            {text}
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <ButtonLink href="/onboarding" size="lg">
          {t("welcome.getStarted")}
        </ButtonLink>
        <ButtonLink href="/login" size="lg" variant="ghost">
          {t("welcome.logIn")}
        </ButtonLink>
        <p className="pt-2 text-center text-caption text-muted-foreground">{t("app.prototypeNotice")}</p>
      </div>
    </main>
  );
}
