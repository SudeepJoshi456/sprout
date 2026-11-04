"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Screen } from "@/components/shell/screen";
import { Avatar } from "@/components/ui/avatar";
import { api, ApiClientError } from "@/lib/client/api";
import type { PersonaId } from "@/lib/types";
import { t } from "@/i18n";

const PEOPLE: Array<{ id: PersonaId; name: string; role: "login.sudeepRole" | "login.marcusRole" }> = [
  { id: "sudeep", name: "Sudeep Joshi", role: "login.sudeepRole" },
  { id: "marcus", name: "Marcus Johnson", role: "login.marcusRole" },
];

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState<PersonaId | null>(null);

  const login = async (persona: PersonaId) => {
    setBusy(persona);
    try {
      await api("/api/session/login", { method: "POST", body: { persona } });
      router.push("/home");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("app.genericError"));
      setBusy(null);
    }
  };

  return (
    <Screen title={t("login.title")} back="/">
      <p className="mb-5 text-body text-muted-foreground">{t("login.sub")}</p>
      <ul className="space-y-3">
        {PEOPLE.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => login(p.id)}
              disabled={busy !== null}
              aria-busy={busy === p.id}
              aria-label={t("login.continueAs", { name: p.name })}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-colors hover:border-primary disabled:opacity-60"
            >
              <Avatar name={p.name} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block text-title font-semibold">{p.name}</span>
                <span className="block text-caption text-muted-foreground">{t(p.role)}</span>
              </span>
              {busy === p.id ? (
                <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
              ) : (
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-body text-muted-foreground">
        {t("login.newHere")}{" "}
        <Link href="/onboarding" className="font-semibold text-primary underline underline-offset-4">
          {t("login.startOnboarding")}
        </Link>
      </p>
    </Screen>
  );
}
