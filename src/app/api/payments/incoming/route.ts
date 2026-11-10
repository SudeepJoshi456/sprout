import { randomUUID } from "node:crypto";
import { withSession } from "@/lib/server/http";
import { connectedWallet } from "@/lib/server/connected";
import { listOwnIncomingPayments } from "@/lib/server/payments/interledger";
import { hostOf } from "@/lib/server/payments/types";
import { claimIncoming, sentBySession } from "@/lib/server/store";
import type { Transfer } from "@/lib/types";

/**
 * POST /api/payments/incoming: checks the user's real wallet for money that
 * arrived over Interledger and credits anything new. Idempotent: each incoming
 * payment is credited only for the amount not yet seen.
 */
export async function POST(req: Request) {
  return withSession(req, async ({ userId, user }) => {
    if (!(await connectedWallet(userId, user))) return { live: false, received: [] };

    user.incoming ??= { since: new Date(Date.now() - 10 * 60_000).toISOString(), credited: {} };
    const sync = user.incoming;
    let payments;
    try {
      payments = await listOwnIncomingPayments(user.profile.walletAddress!);
    } catch {
      return { live: true, received: [], error: "unreachable" };
    }

    const received: Transfer[] = [];
    for (const ip of [...payments].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (ip.createdAt < sync.since) continue;
      const delta = ip.receivedCents - (sync.credited[ip.url] ?? 0);
      if (delta <= 0) continue;
      if (await sentBySession(ip.url, userId)) continue;
      const request = user.requests.find((r) => r.incomingPaymentUrl === ip.url);
      if (!request && !(await claimIncoming(ip.url, userId))) continue;
      sync.credited[ip.url] = ip.receivedCents;

      if (request) {
        request.receivedCents = ip.receivedCents;
        if (ip.receivedCents >= request.amountCents) request.paidAt ??= new Date().toISOString();
      }

      const now = new Date().toISOString();
      const label = request ? `Payment request${request.note ? ` · ${request.note}` : ""}` : ip.description ?? "Interledger payment";
      const transfer: Transfer = {
        id: randomUUID(),
        direction: "in",
        status: "completed",
        counterpartyName: label,
        counterpartyWallet: user.profile.walletAddress!,
        debit: { value: delta, currency: "USD" },
        counterpart: ip.received.currency === "USD" ? { value: delta, currency: "USD" } : ip.received,
        feeCents: 0,
        rate: null,
        createdAt: ip.createdAt,
        completedAt: now,
        idempotencyKey: `${ip.url}#${ip.receivedCents}`,
        mode: "interledger",
        note: ip.description ?? undefined,
        externalId: ip.url,
        steps: [
          {
            id: "incoming-payment",
            label: "Money arrived at your incoming payment",
            detail: `The sender's wallet streamed Interledger packets into ${ip.url} until ${ip.completed ? "it was complete" : "they stopped"}. Received so far: ${(ip.received.value / 100).toFixed(2)} ${ip.received.currency}.`,
            server: hostOf(ip.url),
            ms: 0,
            simulated: false,
          },
          {
            id: "incoming-sync",
            label: "Sprout read it from your wallet",
            detail: "Sprout lists incoming payments on your wallet address with a non-interactive grant and credits only the new amount, so nothing is counted twice.",
            server: hostOf(ip.url),
            ms: 0,
            simulated: false,
          },
        ],
      };
      user.transfers.unshift(transfer);
      user.transactions.unshift({
        id: randomUUID(),
        date: now,
        description: `Received · ${label}`,
        amountCents: delta,
        category: "income",
        transferId: transfer.id,
      });
      received.push(transfer);
    }
    return { live: true, received };
  });
}
