"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Screen } from "@/components/shell/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api, ApiClientError } from "@/lib/client/api";
import { useResource } from "@/lib/client/hooks";
import { formatMoney } from "@/lib/format";

interface TreasuryStatus {
  treasury: { live: boolean; wallet: string | null; connected: boolean; capMinor: number | null; assetScale: number | null; linkedAt: string | null };
}

/**
 * Admin only: approve Sprout's treasury wallet once so it can pay out sells.
 * Same approval flow people use for their own wallets, but the token is saved
 * as Sprout's, never tied to a person.
 */
export default function TreasuryPage() {
  return (
    <Suspense>
      <Treasury />
    </Suspense>
  );
}

function Treasury() {
  const params = useSearchParams();
  const { data, error, loading } = useResource<TreasuryStatus>("/api/admin/treasury");
  const [capDollars, setCapDollars] = useState("200");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const result = params.get("wallet");
  const s = data?.treasury;

  const connect = async () => {
    if (!s?.wallet) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ redirect: string }>("/api/wallet/connect", {
        method: "POST",
        body: { walletAddress: s.wallet, capCents: Math.round(Number(capDollars) * 100), purpose: "treasury" },
      });
      window.location.href = res.redirect;
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <Screen title="Sprout treasury" back="/profile">
      <div className="space-y-4 pt-3">
        {result && (
          <p role="status" className={`rounded-xl p-3 text-body ${result === "connected" ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"}`}>
            {result === "connected" ? "Treasury approved. Sells can now be paid out." : "The approval didn't go through. Try again."}
          </p>
        )}
        {loading && !data ? (
          <Card>Loading…</Card>
        ) : error ? (
          <Card>
            <p className="flex items-start gap-2 text-body text-negative">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error.message}
            </p>
          </Card>
        ) : s ? (
          <Card className="space-y-3">
            <dl className="space-y-2 text-body">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Wallet investing</dt>
                <dd className="font-semibold">{s.live ? "On" : "Off (set PAYMENTS_MODE and TREASURY_WALLET)"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Treasury wallet</dt>
                <dd className="truncate font-semibold">{s.wallet?.replace(/^https:\/\//, "") ?? "Not set"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Payout approval</dt>
                <dd className="flex items-center gap-1 font-semibold">
                  {s.connected ? (
                    <>
                      <CircleCheck className="size-4 text-positive" aria-hidden /> Approved
                      {s.capMinor !== null && s.assetScale !== null && ` · cap ${formatMoney(Math.round((s.capMinor / 10 ** s.assetScale) * 100))}`}
                    </>
                  ) : (
                    "Not approved yet"
                  )}
                </dd>
              </div>
            </dl>
            {s.live && (
              <>
                <Field label="Payout limit (USD)" inputMode="decimal" value={capDollars} onChange={(e) => setCapDollars(e.target.value.replace(/[^\d.]/g, ""))} />
                {err && <p role="alert" className="text-body text-negative">{err}</p>}
                <Button size="lg" onClick={connect} loading={busy} disabled={!Number(capDollars)}>
                  {s.connected ? "Approve again with a new limit" : "Approve Sprout's wallet"}
                </Button>
                <p className="text-caption text-muted-foreground">
                  You&rsquo;ll log in to the treasury wallet and approve Sprout to pay out up to this limit. Buys don&rsquo;t need this; only sells do.
                </p>
              </>
            )}
          </Card>
        ) : null}
      </div>
    </Screen>
  );
}
