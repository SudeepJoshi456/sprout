import { z } from "zod";
import { TICKER_MAP } from "@/data/tickers";
import { formatMoney } from "@/lib/format";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { executeQuote, verifyQuote } from "@/lib/server/payments";
import { markSentIncoming } from "@/lib/server/store";
import { getLinkedWallet, grantStoreFor } from "@/lib/server/wallet-link";
import { TREASURY_NAME, applyOwnedTrade, getTreasuryLink, ownedHolding, ownedOf, treasuryGrantStore, verifyOrder, type InvestOrder } from "@/lib/server/invest";
import type { OwnedTrade, PaymentQuote, Transfer } from "@/lib/types";

/**
 * POST /api/invest/execute: pays a reviewed order over Interledger, then records
 * the shares. Buys pay from the person's wallet to Sprout's; sells pay from
 * Sprout's wallet to theirs. Shares only change after the payment succeeds, and
 * the idempotency key makes retries and double taps return the original trade.
 */
const schema = z.object({
  quote: z.custom<PaymentQuote>((v) => typeof v === "object" && v !== null && "signature" in v),
  order: z.custom<InvestOrder>((v) => typeof v === "object" && v !== null && "signature" in v),
  idempotencyKey: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  return withSession(req, async ({ userId, user }) => {
    const body = await parseBody(req, schema);
    const owned = ownedOf(user);
    const prior = owned.trades.find((t) => t.id === body.idempotencyKey);
    if (prior) return { trade: prior, duplicate: true };

    const q = body.quote;
    const order = body.order;
    verifyQuote(q);
    verifyOrder(order, userId, q.id);
    if (q.mode !== "interledger") throw new ApiError(409, "invest_off", "Investing with your wallet isn't set up on this server yet.");

    const name = TICKER_MAP[order.symbol]?.name ?? order.symbol;
    let grants;
    if (order.side === "buy") {
      const link = await getLinkedWallet(userId);
      if (!link || link.wallet !== q.senderWallet) {
        throw new ApiError(409, "wallet_not_connected", "This order isn't from your connected wallet. Nothing was sent.");
      }
      grants = grantStoreFor(userId, link);
    } else {
      const holding = ownedHolding(user, order.symbol);
      if (!holding || holding.shares + 1e-9 < order.shares) throw new ApiError(422, "exceeds_position", "You no longer own that many shares. Nothing was sold.");
      const treasury = await getTreasuryLink();
      if (!treasury || treasury.wallet !== q.senderWallet) {
        throw new ApiError(503, "treasury_not_ready", "Selling isn't available right now. Nothing was sold.");
      }
      grants = treasuryGrantStore(treasury);
      // The payout lands in this person's wallet; don't count it again as a new incoming payment.
      if (q.incomingPaymentUrl) await markSentIncoming(q.incomingPaymentUrl, userId);
    }

    const label = order.side === "buy" ? `Bought ${formatMoney(order.amountCents)} of ${name}` : `Sold ${formatMoney(order.amountCents)} of ${name}`;
    const result = await executeQuote(q, body.idempotencyKey, label, grants);

    // A concurrent request with the same key may have recorded it while we awaited.
    const raced = owned.trades.find((t) => t.id === body.idempotencyKey);
    if (raced) return { trade: raced, duplicate: true };

    const now = new Date().toISOString();
    const trade: OwnedTrade = {
      id: body.idempotencyKey,
      symbol: order.symbol,
      side: order.side,
      amountCents: order.amountCents,
      shares: order.shares,
      price: order.price,
      at: now,
      paymentId: result.externalId,
      feeCents: q.feeCents,
    };
    applyOwnedTrade(owned, trade);

    const transfer: Transfer = {
      id: body.idempotencyKey,
      direction: order.side === "buy" ? "out" : "in",
      status: "completed",
      counterpartyName: `${TREASURY_NAME} · ${label}`,
      counterpartyWallet: order.side === "buy" ? q.receiver.url : q.senderWallet!,
      debit: order.side === "buy" ? { value: q.debitCents, currency: "USD" } : q.receive,
      counterpart: q.receive,
      feeCents: order.side === "buy" ? q.feeCents : 0,
      rate: q.rate,
      createdAt: now,
      completedAt: now,
      idempotencyKey: body.idempotencyKey,
      mode: "interledger",
      note: label,
      externalId: order.side === "buy" ? result.externalId : q.incomingPaymentUrl,
      steps: result.steps ?? [],
    };
    user.transfers.unshift(transfer);
    return { trade };
  });
}
