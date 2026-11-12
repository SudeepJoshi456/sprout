import { connectedWallet } from "@/lib/server/connected";
import { errorResponse, requireUser } from "@/lib/server/http";
import { listOwnIncomingPayments, listOwnOutgoingPayments } from "@/lib/server/payments/interledger";
import { grantStoreFor } from "@/lib/server/wallet-link";
import { setWalletOwner } from "@/lib/server/users";
import type { WalletActivity, WalletActivityItem as ActivityItem } from "@/lib/types";

/**
 * GET /api/wallet/activity: money in and out of the person's connected
 * Interledger wallet, read live from their wallet over Open Payments.
 * Open Payments doesn't expose balances, so this shows real payments, not a balance.
 */
export async function GET(req: Request) {
  try {
    const record = await requireUser(req);
    const link = await connectedWallet(record.id, record.state);
    if (!link) return Response.json({ connected: false } satisfies WalletActivity);

    const [incoming, outgoing] = await Promise.allSettled([
      listOwnIncomingPayments(link.wallet),
      listOwnOutgoingPayments(link.wallet, grantStoreFor(record.id, link)),
    ]);

    // Sprout's own record of each payment knows the person's name, even for payments
    // made before names were written into the wallet's history.
    await setWalletOwner(link.wallet, record.id).catch(() => undefined);
    const byExternal = new Map(record.state.transfers.filter((t) => t.externalId).map((t) => [t.externalId!, t]));
    const named = (description: string | null, prefix: "From " | "To ") =>
      description?.startsWith(prefix) ? description.slice(prefix.length).split(" · ")[0] : null;

    const items: ActivityItem[] = [];
    if (incoming.status === "fulfilled") {
      for (const ip of incoming.value) {
        if (ip.received.value <= 0) continue;
        const known = byExternal.get(ip.url);
        const request = record.state.requests.find((r) => r.incomingPaymentUrl === ip.url);
        items.push({
          id: ip.url,
          direction: "in",
          amount: ip.received.value,
          currency: ip.received.currency,
          at: ip.createdAt,
          description: ip.description,
          counterparty: null,
          counterpartyName: named(ip.description, "From ") ?? (request ? "Payment request" : known?.counterpartyName ?? null),
          note: request?.note ?? null,
          status: ip.completed ? "completed" : "pending",
        });
      }
    }
    if (outgoing.status === "fulfilled") {
      for (const op of outgoing.value) {
        const known = byExternal.get(op.url);
        items.push({
          id: op.url,
          direction: "out",
          amount: op.sent.value,
          currency: op.sent.currency,
          at: op.createdAt,
          description: op.description,
          counterparty: known?.counterpartyWallet ?? op.receiver,
          counterpartyName: known?.counterpartyName ?? named(op.description, "To "),
          note: known?.note ?? null,
          status: op.failed ? "failed" : op.sent.value > 0 ? "completed" : "pending",
        });
      }
    }
    items.sort((a, b) => b.at.localeCompare(a.at));

    const total = (dir: "in" | "out") => items.filter((i) => i.direction === dir && i.status !== "failed").reduce((sum, i) => sum + i.amount, 0);
    return Response.json({
      connected: true,
      wallet: link.wallet,
      currency: link.assetCode,
      receivedMinor: total("in"),
      sentMinor: total("out"),
      capMinor: link.capMinor,
      items: items.slice(0, 50),
      partial: incoming.status === "rejected" || outgoing.status === "rejected",
    } satisfies WalletActivity);
  } catch (err) {
    return errorResponse(err);
  }
}
