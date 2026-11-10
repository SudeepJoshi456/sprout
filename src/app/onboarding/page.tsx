"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  CircleCheck,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  HeartHandshake,
  IdCard,
  LineChart,
  Lock,
  Plane,
  Scale,
  ShieldCheck,
  Umbrella,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/progress";
import { SimulatedBadge } from "@/components/ui/badge";
import { api, ApiClientError, invalidate } from "@/lib/client/api";
import { ConnectWallet, WalletReturnNotice } from "@/components/money/connect-wallet";
import { useBootstrap, useClientState, useReducedMotion } from "@/lib/client/hooks";
import { cn } from "@/lib/format";
import { atHandle } from "@/lib/handles";
import type { Goal, IdType, Reason, VisaType } from "@/lib/types";
import { t } from "@/i18n";

const TOTAL = 5;
const DRAFT_KEY = "sprout.onboarding.v1";

const COUNTRIES = [
  "Bangladesh", "Brazil", "Canada", "China", "Colombia", "Ghana", "India", "Indonesia", "Japan", "Kenya",
  "Mexico", "Nepal", "Nigeria", "Pakistan", "Philippines", "South Korea", "Taiwan", "Turkey", "United Kingdom", "Vietnam", "Other",
];
const VISAS: VisaType[] = ["F-1", "J-1", "H-1B", "other"];

/**
 * The draft is saved to localStorage so people can leave and come back.
 * The full ID number is deliberately NOT part of the draft: only the last 4
 * characters, and only after verification.
 */
interface Draft {
  step: number;
  reasons: Reason[];
  fullName: string;
  preferredName: string;
  idType: IdType | null;
  idCountry: string;
  visaType: VisaType;
  schoolEmail: string;
  idLast4: string | null;
  walletAddress: string;
  walletCurrency: string | null;
  goal: Goal | null;
}

const EMPTY: Draft = {
  step: 1,
  reasons: [],
  fullName: "",
  preferredName: "",
  idType: null,
  idCountry: "",
  visaType: "F-1",
  schoolEmail: "",
  idLast4: null,
  walletAddress: "",
  walletCurrency: null,
  goal: null,
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** ★ Onboarding: 5 short steps, one decision per screen. */
export default function OnboardingPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const { state, error, retry } = useBootstrap();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setDraft(loadDraft());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);
  useEffect(() => {
    if (hydrated) headingRef.current?.focus();
  }, [draft.step, hydrated]);

  const onboarded = state?.user.profile.onboarded;
  useEffect(() => {
    if (onboarded) router.replace("/home");
  }, [onboarded, router]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const go = (step: number) => update({ step });
  const back = () => (draft.step > 1 ? go(draft.step - 1) : router.push("/"));

  const step = draft.step;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 px-2 pt-1">
        <div className="flex min-h-14 items-center gap-1">
          <button type="button" onClick={back} aria-label={t("app.back")} className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted">
            <ChevronLeft className="size-6" aria-hidden />
          </button>
          <p className="flex-1 text-center text-body font-semibold text-muted-foreground" aria-live="polite">
            {t("onboarding.step", { n: step, total: TOTAL })}
          </p>
          <span className="size-11" />
        </div>
        <div className="px-3 pb-2">
          <ProgressBar value={step / TOTAL} label={t("onboarding.progress")} valueText={t("onboarding.step", { n: step, total: TOTAL })} />
        </div>
      </header>

      {error && !state ? (
        <main id="main" role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-body">{error.message}</p>
          <Button onClick={retry}>{t("app.retry")}</Button>
        </main>
      ) : !hydrated || !state || onboarded ? (
        <main id="main" className="flex-1" />
      ) : (
        <>
          {step === 1 && <ReasonsStep draft={draft} update={update} headingRef={headingRef} onNext={() => go(2)} />}
          {step === 2 && <NameStep draft={draft} update={update} headingRef={headingRef} onNext={() => go(3)} />}
          {step === 3 && <IdentityStep draft={draft} update={update} headingRef={headingRef} onNext={() => go(4)} />}
          {step === 4 && <WalletStep draft={draft} update={update} headingRef={headingRef} onNext={() => go(5)} />}
          {step === 5 && (
            <GoalStep
              draft={draft}
              update={update}
              headingRef={headingRef}
              onDone={() => {
                localStorage.removeItem(DRAFT_KEY);
                invalidate("/api/");
                router.replace("/home?welcome=1");
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

interface StepProps {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}

function StepLayout({
  title,
  sub,
  headingRef,
  children,
  footer,
}: {
  title: string;
  sub: string;
  headingRef: StepProps["headingRef"];
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <>
      <main id="main" className="min-h-0 flex-1 animate-fade-in overflow-y-auto px-5 pb-6">
        <h1 ref={headingRef} tabIndex={-1} className="mt-3 font-display text-headline font-semibold outline-none">
          {title}
        </h1>
        <p className="mt-1.5 text-body text-muted-foreground">{sub}</p>
        <div className="mt-6">{children}</div>
      </main>
      <div className="safe-bottom shrink-0 space-y-2 border-t border-border/60 bg-background px-5 pt-3">
        {footer}
        <p className="pb-1 text-center text-caption text-muted-foreground">{t("onboarding.savedNotice")}</p>
      </div>
    </>
  );
}

function ReasonsStep({ draft, update, headingRef, onNext }: StepProps & { onNext: () => void }) {
  const toggle = (r: Reason, on: boolean) =>
    update({ reasons: on ? [...new Set([...draft.reasons, r])] : draft.reasons.filter((x) => x !== r) });
  const options: { id: Reason; title: string; hint: string; Icon: typeof Plane }[] = [
    { id: "new_to_us", title: t("onboarding.reasons.newToUs"), hint: t("onboarding.reasons.newToUsHint"), Icon: Plane },
    { id: "new_to_money", title: t("onboarding.reasons.newToMoney"), hint: t("onboarding.reasons.newToMoneyHint"), Icon: Wallet },
    { id: "learn_investing", title: t("onboarding.reasons.learnInvesting"), hint: t("onboarding.reasons.learnInvestingHint"), Icon: LineChart },
  ];
  return (
    <StepLayout
      title={t("onboarding.reasons.title")}
      sub={t("onboarding.reasons.sub")}
      headingRef={headingRef}
      footer={
        <Button size="lg" onClick={onNext} disabled={draft.reasons.length === 0}>
          {t("app.continue")}
        </Button>
      }
    >
      <fieldset className="space-y-3">
        <legend className="sr-only">{t("onboarding.reasons.title")}</legend>
        {options.map((o) => (
          <ChoiceCard
            key={o.id}
            type="checkbox"
            name="reasons"
            checked={draft.reasons.includes(o.id)}
            onChange={(on) => toggle(o.id, on)}
            title={o.title}
            hint={o.hint}
            icon={<o.Icon className="size-5" aria-hidden />}
          />
        ))}
      </fieldset>
    </StepLayout>
  );
}

function NameStep({ draft, update, headingRef, onNext }: StepProps & { onNext: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.fullName.trim()) return setError(t("onboarding.name.required"));
    onNext();
  };
  return (
    <form onSubmit={submit} className="contents" noValidate>
      <StepLayout
        title={t("onboarding.name.title")}
        sub={t("onboarding.name.sub")}
        headingRef={headingRef}
        footer={
          <Button size="lg" type="submit">
            {t("app.continue")}
          </Button>
        }
      >
        <div className="space-y-5">
          <Field
            label={t("onboarding.name.fullName")}
            hint={t("onboarding.name.fullNameHint")}
            value={draft.fullName}
            onChange={(e) => {
              update({ fullName: e.target.value });
              setError(null);
            }}
            error={error}
            autoComplete="name"
            autoCapitalize="words"
            spellCheck={false}
          />
          <Field
            label={t("onboarding.name.preferred")}
            hint={t("onboarding.name.preferredHint")}
            value={draft.preferredName}
            onChange={(e) => update({ preferredName: e.target.value })}
            autoComplete="nickname"
          />
        </div>
      </StepLayout>
    </form>
  );
}

type VerifyState = "idle" | "checking" | "verified";

function IdentityStep({
  draft,
  update,
  headingRef,
  onNext,
}: StepProps & { onNext: () => void }) {
  const reduced = useReducedMotion();
  const [number, setNumber] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [verify, setVerify] = useState<VerifyState>(draft.idLast4 ? "verified" : "idle");
  const [whyOpen, setWhyOpen] = useState(false);
  const [intro, setIntro] = useState(!draft.idLast4);

  const choose = (idType: IdType) => {
    update({ idType, idLast4: null });
    setNumber("");
    setErrors({});
    setVerify("idle");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verify === "verified") return onNext();
    const errs: Record<string, string | null> = {};
    const clean = number.replace(/[\s-]/g, "");
    if (draft.idType === "passport") {
      if (!draft.idCountry) errs.country = t("onboarding.identity.errCountry");
      if (!clean) errs.number = t("onboarding.identity.errNumber");
      else if (!/^[A-Za-z0-9]{6,9}$/.test(clean)) errs.number = t("onboarding.identity.errPassport");
      if (draft.schoolEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.schoolEmail)) errs.email = t("onboarding.identity.errEmail");
    } else {
      if (!clean) errs.number = t("onboarding.identity.errNumber");
      else if (!/^\d{9}$/.test(clean)) errs.number = t("onboarding.identity.errSsn");
    }
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setVerify("checking");
    // Simulated verification. Only the last 4 characters are kept.
    window.setTimeout(() => {
      update({ idLast4: clean.slice(-4).toUpperCase() });
      setNumber("");
      setVerify("verified");
    }, reduced ? 800 : 2000);
  };

  const idOptions: { id: IdType; title: string; hint: string; Icon: typeof IdCard }[] = [
    { id: "ssn", title: t("onboarding.identity.ssn"), hint: t("onboarding.identity.ssnWhy"), Icon: ShieldCheck },
    { id: "itin", title: t("onboarding.identity.itin"), hint: t("onboarding.identity.itinWhy"), Icon: IdCard },
    { id: "passport", title: t("onboarding.identity.passport"), hint: t("onboarding.identity.passportWhy"), Icon: Globe },
  ];

  if (intro) {
    const points = [
      { Icon: Scale, title: t("onboarding.trust.whyTitle"), body: t("onboarding.trust.whyBody") },
      { Icon: Lock, title: t("onboarding.trust.protectTitle"), body: t("onboarding.trust.protectBody") },
      { Icon: Eye, title: t("onboarding.trust.whoTitle"), body: t("onboarding.trust.whoBody") },
    ];
    return (
      <StepLayout
        title={t("onboarding.trust.title")}
        sub={t("onboarding.trust.sub")}
        headingRef={headingRef}
        footer={
          <Button size="lg" onClick={() => setIntro(false)}>
            {t("onboarding.trust.cta")}
          </Button>
        }
      >
        <ul className="space-y-4">
          {points.map(({ Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-positive-soft text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-body font-semibold">{title}</span>
                <span className="block text-body text-muted-foreground">{body}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 flex items-start gap-2 rounded-xl bg-secondary/70 p-3 text-caption text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          {t("onboarding.trust.prototype")}
        </p>
      </StepLayout>
    );
  }

  if (verify !== "idle") {
    return (
      <form onSubmit={submit} className="contents">
        <StepLayout
          title={verify === "checking" ? t("onboarding.identity.verifying") : t("onboarding.identity.verified")}
          sub={verify === "checking" ? t("onboarding.identity.verifyingSub") : t("onboarding.identity.verifiedSub", { name: draft.preferredName || draft.fullName.split(" ")[0] })}
          headingRef={headingRef}
          footer={
            <Button size="lg" type="submit" disabled={verify === "checking"}>
              {t("app.continue")}
            </Button>
          }
        >
          <div role="status" aria-live="polite" className="flex flex-col items-center py-8 text-center">
            {verify === "checking" ? (
              <span className="size-20 animate-spin rounded-full border-4 border-muted border-t-primary" aria-hidden />
            ) : (
              <span className="flex size-20 animate-pop items-center justify-center rounded-full bg-positive-soft text-positive">
                <CircleCheck className="size-12" aria-hidden />
              </span>
            )}
            <p className="mt-4 text-title font-semibold">
              {verify === "checking" ? t("onboarding.identity.verifying") : `${t("onboarding.identity.verified")} ✓`}
            </p>
            {verify === "verified" && draft.idLast4 && (
              <p className="tnum mt-1 text-body text-muted-foreground">
                {draft.idType === "passport" ? t("onboarding.identity.passportNumber") : draft.idType === "ssn" ? t("onboarding.identity.ssnLabel") : t("onboarding.identity.itinLabel")} •••• {draft.idLast4}
              </p>
            )}
            <SimulatedBadge className="mt-4" />
            <p className="mt-2 max-w-xs text-caption text-muted-foreground">{t("onboarding.identity.simulatedNote")}</p>
          </div>
        </StepLayout>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="contents" noValidate>
      <StepLayout
        title={t("onboarding.identity.title")}
        sub={t("onboarding.identity.sub")}
        headingRef={headingRef}
        footer={
          <Button size="lg" type="submit" disabled={!draft.idType}>
            {t("onboarding.identity.verify")}
          </Button>
        }
      >
        <fieldset className="space-y-3">
          <legend className="sr-only">{t("onboarding.identity.title")}</legend>
          {idOptions.map((o) => (
            <ChoiceCard
              key={o.id}
              type="radio"
              name="idType"
              checked={draft.idType === o.id}
              onChange={() => choose(o.id)}
              title={o.title}
              hint={o.hint}
              icon={<o.Icon className="size-5" aria-hidden />}
            />
          ))}
        </fieldset>

        {draft.idType && (
          <div className="mt-6 animate-fade-in space-y-5">
            {draft.idType === "passport" && (
              <div className="space-y-1.5">
                <label htmlFor="country" className="block text-body font-medium">
                  {t("onboarding.identity.country")}
                </label>
                <div className="relative">
                  <select
                    id="country"
                    value={draft.idCountry}
                    onChange={(e) => {
                      update({ idCountry: e.target.value });
                      setErrors((x) => ({ ...x, country: null }));
                    }}
                    aria-invalid={errors.country ? true : undefined}
                    aria-describedby={errors.country ? "country-err" : undefined}
                    className={cn(
                      "min-h-12 w-full appearance-none rounded-xl border bg-card px-3.5 pr-10 text-body text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30",
                      errors.country ? "border-negative" : "border-input",
                    )}
                  >
                    <option value="">{t("onboarding.identity.chooseCountry")}</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                </div>
                {errors.country && (
                  <p id="country-err" role="alert" className="text-caption font-medium text-negative">
                    {errors.country}
                  </p>
                )}
              </div>
            )}

            <Field
              label={
                draft.idType === "passport"
                  ? t("onboarding.identity.passportNumber")
                  : draft.idType === "ssn"
                    ? t("onboarding.identity.ssnLabel")
                    : t("onboarding.identity.itinLabel")
              }
              hint={draft.idType === "passport" ? t("onboarding.identity.passportHint") : t("onboarding.identity.numberHint")}
              type={show ? "text" : "password"}
              inputMode={draft.idType === "passport" ? "text" : "numeric"}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={draft.idType === "passport" ? 12 : 11}
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
                setErrors((x) => ({ ...x, number: null }));
              }}
              error={errors.number}
              className="[&_input]:tnum [&_input]:tracking-widest"
              trailing={
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-caption font-semibold text-primary"
                  aria-pressed={show}
                >
                  {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  {show ? t("onboarding.identity.hide") : t("onboarding.identity.show")}
                </button>
              }
            />

            {draft.idType === "passport" && (
              <>
                <fieldset>
                  <legend className="mb-1.5 text-body font-medium">{t("onboarding.identity.visaType")}</legend>
                  <div className="grid grid-cols-4 gap-2">
                    {VISAS.map((v) => (
                      <label
                        key={v}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 text-body font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                          draft.visaType === v ? "border-primary bg-accent/40" : "border-border",
                        )}
                      >
                        <input type="radio" name="visa" className="sr-only" checked={draft.visaType === v} onChange={() => update({ visaType: v })} />
                        {v === "other" ? t("onboarding.identity.visaOther") : v}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field
                  label={t("onboarding.identity.schoolEmail")}
                  hint={t("onboarding.identity.schoolEmailHint")}
                  type="email"
                  autoComplete="email"
                  value={draft.schoolEmail}
                  onChange={(e) => {
                    update({ schoolEmail: e.target.value });
                    setErrors((x) => ({ ...x, email: null }));
                  }}
                  error={errors.email}
                />
              </>
            )}
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-secondary/70 p-4">
          <button
            type="button"
            onClick={() => setWhyOpen((o) => !o)}
            aria-expanded={whyOpen}
            className="flex min-h-11 w-full items-center gap-2 text-left text-body font-semibold"
          >
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            <span className="flex-1">{t("onboarding.identity.whyAsk")}</span>
            <ChevronDown className={cn("size-5 transition-transform", whyOpen && "rotate-180")} aria-hidden />
          </button>
          {whyOpen && <p className="mt-1 text-body text-muted-foreground">{t("onboarding.identity.whyAskBody")}</p>}
        </div>
      </StepLayout>
    </form>
  );
}

function WalletStep({ draft, headingRef, onNext }: StepProps & { onNext: () => void }) {
  const state = useClientState();
  const handle = atHandle(draft.preferredName || draft.fullName || "you");
  const live = state?.modes.payments === "interledger";
  const wallet = state?.wallet;

  return (
    <StepLayout
      title={t("onboarding.wallet.title")}
      sub={t("onboarding.wallet.sub")}
      headingRef={headingRef}
      footer={
        <Button size="lg" variant={live && !wallet ? "ghost" : "primary"} onClick={onNext}>
          {live && !wallet ? t("onboarding.wallet.skip") : t("app.continue")}
        </Button>
      }
    >
      <Suspense>
        <WalletReturnNotice />
      </Suspense>
      {wallet ? (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-positive-soft p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CircleCheck className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-title font-semibold">{t("onboarding.wallet.connectedTitle")}</span>
            <span className="block truncate text-caption text-muted-foreground">{wallet.url.replace(/^https:\/\//, "")}</span>
            <span className="block text-caption text-primary">
              {t("onboarding.wallet.usernameLabel")}: {handle}
            </span>
          </span>
        </div>
      ) : live ? (
        <ConnectWallet returnTo="/onboarding" />
      ) : (
        <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-body text-muted-foreground">
          <Wallet className="mt-0.5 size-5 shrink-0" aria-hidden />
          {t("onboarding.wallet.offline")}
        </p>
      )}
      <p className="mt-4 flex items-start gap-2 text-caption text-muted-foreground">
        <Globe className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t("onboarding.wallet.whatsThisBody")}
      </p>
    </StepLayout>
  );
}

function GoalStep({ draft, update, headingRef, onDone }: StepProps & { onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const goals: { id: Goal; title: string; hint: string; Icon: typeof Umbrella }[] = [
    { id: "emergency_fund", title: t("onboarding.goal.emergency"), hint: t("onboarding.goal.emergencyHint"), Icon: Umbrella },
    { id: "send_home", title: t("onboarding.goal.sendHome"), hint: t("onboarding.goal.sendHomeHint"), Icon: HeartHandshake },
    { id: "start_investing", title: t("onboarding.goal.investing"), hint: t("onboarding.goal.investingHint"), Icon: LineChart },
    { id: "understand_credit", title: t("onboarding.goal.credit"), hint: t("onboarding.goal.creditHint"), Icon: CreditCard },
  ];

  const finish = async () => {
    if (!draft.goal || !draft.idType || !draft.idLast4) {
      // Missing an earlier step (e.g. a stale draft): send them back to it.
      if (!draft.idLast4) update({ step: 3 });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api("/api/onboarding", {
        method: "POST",
        body: {
          fullName: draft.fullName.trim(),
          preferredName: draft.preferredName.trim() || undefined,
          reasons: draft.reasons.length ? draft.reasons : ["new_to_money"],
          idType: draft.idType,
          idLast4: draft.idLast4,
          idCountry: draft.idType === "passport" ? draft.idCountry : undefined,
          visaType: draft.idType === "passport" ? draft.visaType : undefined,
          schoolEmail: draft.idType === "passport" ? draft.schoolEmail.trim() : undefined,
          goal: draft.goal,
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("app.genericError"));
      setSubmitting(false);
    }
  };

  return (
    <StepLayout
      title={t("onboarding.goal.title")}
      sub={t("onboarding.goal.sub")}
      headingRef={headingRef}
      footer={
        <>
          {error && (
            <p role="alert" className="text-center text-caption font-medium text-negative">
              {error}
            </p>
          )}
          <Button size="lg" onClick={finish} disabled={!draft.goal} loading={submitting} loadingText={t("onboarding.finishing")}>
            {t("onboarding.goal.finish")}
          </Button>
        </>
      }
    >
      <fieldset className="space-y-3">
        <legend className="sr-only">{t("onboarding.goal.title")}</legend>
        {goals.map((g) => (
          <ChoiceCard
            key={g.id}
            type="radio"
            name="goal"
            checked={draft.goal === g.id}
            onChange={() => update({ goal: g.id })}
            title={g.title}
            hint={g.hint}
            icon={<g.Icon className="size-5" aria-hidden />}
          />
        ))}
      </fieldset>
      <p className="mt-6 flex items-start gap-2 text-caption text-muted-foreground">
        <BookOpen className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t("app.prototypeNotice")}
      </p>
    </StepLayout>
  );
}
