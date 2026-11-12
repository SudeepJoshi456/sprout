"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api, ApiClientError, clearClient, type ClientState } from "@/lib/client/api";
import { passwordProblem } from "@/lib/password";
import { t } from "@/i18n";

/** Email + password form for both logging in and signing up. */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const signup = mode === "signup";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const emailBad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const pwBad = signup ? passwordProblem(password) : password ? null : t("login.password");
    setEmailError(emailBad ? t("signup.errEmail") : null);
    setPasswordError(pwBad);
    setAgreeError(signup && !agreed);
    if (emailBad || pwBad || (signup && !agreed)) return;
    setBusy(true);
    try {
      clearClient();
      const res = await api<{ state: ClientState }>(signup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        body: signup ? { email: email.trim(), password, acceptedTerms: true } : { email: email.trim(), password },
      });
      router.replace(res.state.user.profile.onboarded ? "/home" : "/onboarding");
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : t("app.genericError"));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field
        label={t("login.email")}
        type="email"
        inputMode="email"
        autoComplete={signup ? "email" : "username"}
        autoCapitalize="off"
        spellCheck={false}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setEmailError(null);
        }}
        error={emailError}
        required
      />
      <Field
        label={t("login.password")}
        type={show ? "text" : "password"}
        autoComplete={signup ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setPasswordError(null);
        }}
        hint={signup ? t("signup.passwordHint") : undefined}
        error={passwordError}
        required
        trailing={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? t("login.hidePassword") : t("login.showPassword")}
            aria-pressed={show}
            className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        }
      />
      {signup && (
        <div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-body">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                setAgreeError(false);
              }}
              aria-invalid={agreeError}
              aria-describedby={agreeError ? "agree-error" : undefined}
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span>
              {t("signup.agreePrefix")}{" "}
              <Link href="/terms" target="_blank" className="font-semibold text-primary underline underline-offset-4">
                {t("legal.termsTitle")}
              </Link>{" "}
              {t("signup.agreeAnd")}{" "}
              <Link href="/privacy" target="_blank" className="font-semibold text-primary underline underline-offset-4">
                {t("legal.privacyTitle")}
              </Link>
              .
            </span>
          </label>
          {agreeError && (
            <p id="agree-error" role="alert" className="mt-1 text-body font-medium text-negative">
              {t("signup.errAgree")}
            </p>
          )}
        </div>
      )}
      {formError && (
        <p role="alert" className="rounded-xl bg-negative/10 p-3 text-body font-medium text-negative">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={busy} aria-busy={busy}>
        {signup ? t("signup.submit") : t("login.submit")}
      </Button>
      {signup && (
        <p className="flex items-start gap-2 text-caption text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
          {t("signup.privacy")}
        </p>
      )}
      <p className="pt-2 text-center text-body text-muted-foreground">
        {signup ? t("signup.haveAccount") : t("login.newHere")}{" "}
        <Link href={signup ? "/login" : "/signup"} className="font-semibold text-primary underline underline-offset-4">
          {signup ? t("signup.logIn") : t("login.startOnboarding")}
        </Link>
      </p>
    </form>
  );
}
