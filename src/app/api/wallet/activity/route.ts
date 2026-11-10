import { connectedWallet } from "@/lib/server/connected";
import { errorResponse, requireUser } from "@/lib/server/http";
import { listOwnIncomingPayments, listOwnOutgoingPayments } from "@/lib/server/payments/interledger";
import { grantStoreFor } from "@/lib/server/wallet-link";
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

    const items: ActivityItem[] = [];
    if (incoming.status === "fulfilled") {
      for (const ip of incoming.value) {
        if (ip.received.value <= 0) continue;
        items.push({ id: ip.url, direction: "in", amount: ip.received.value, currency: ip.received.currency, at: ip.createdAt, description: ip.description, counterparty: null, status: ip.completed ? "completed" : "pending" });
      }
    }
    if (outgoing.status === "fulfilled") {
      for (const op of outgoing.value) {
        items.push({ id: op.url, direction: "out", amount: op.sent.value, currency: op.sent.currency, at: op.createdAt, description: op.description, counterparty: op.receiver, status: op.failed ? "failed" : op.sent.value > 0 ? "completed" : "pending" });
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
