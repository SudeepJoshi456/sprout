import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { executeQuote, verifyQuote } from "@/lib/server/payments";
import { markSentIncoming, saveSession } from "@/lib/server/store";
import type { PaymentQuote, PaymentStep, Transfer } from "@/lib/types";

/**
 * POST /api/payments/send: executes a reviewed quote.
 *
 * Safety: the quote is HMAC-verified (no client tampering), the idempotency
 * key makes retries and double taps return the original transfer, and money
 * is only debited after the payment succeeds (never optimistic).
 */
const schema = z.object({
  quote: z.custom<PaymentQuote>((v) => typeof v === "object" && v !== null && "signature" in v),
  idempotencyKey: z.string().min(8).max(100),
  note: z.string().max(140).optional(),
  billId: z.string().optional(),
  /** Display-only trace from the quote step, echoed back so the receipt shows the whole flow. */
  quoteSteps: z
    .array(z.object({ id: z.string().max(40), label: z.string().max(120), detail: z.string().max(400), server: z.string().max(200).optional(), ms: z.number(), simulated: z.boolean() }))
    .max(10)
    .optional(),
});

export async function POST(req: Request) {
  return withSession(req, async ({ sid, db, user }) => {
    const body = await parseBody(req, schema);
    const prior = user.transfers.find((t) => t.idempotencyKey === body.idempotencyKey);
    if (prior) return { transfer: prior, duplicate: true };

    const q = body.quote;
    verifyQuote(q);
    if (q.debitCents > user.account.balanceCents) {
      throw new ApiError(422, "insufficient_funds", "Your balance changed and no longer covers this payment. Nothing was sent.");
    }

    if (user.demo.failNextSend) {
      user.demo.failNextSend = false;
      saveSession(sid, db);
      throw new ApiError(503, "network_error", "We couldn't reach the payment network. No money left your account.");
    }

    if (q.incomingPaymentUrl) await markSentIncoming(q.incomingPaymentUrl, sid);
    const result = await executeQuote(q, body.idempotencyKey, body.note);

    // A concurrent request with the same key may have recorded it while we awaited.
    const raced = user.transfers.find((t) => t.idempotencyKey === body.idempotencyKey);
    if (raced) return { transfer: raced, duplicate: true };

    const now = new Date().toISOString();
    const transfer: Transfer = {
      id: randomUUID(),
      direction: "out",
      status: "completed",
      counterpartyName: q.receiverName,
      counterpartyWallet: q.receiver.url,
      debit: { value: q.debitCents, currency: "USD" },
      counterpart: q.receive,
      feeCents: q.feeCents,
      rate: q.rate,
      createdAt: now,
      completedAt: now,
      idempotencyKey: body.idempotencyKey,
      mode: result.mode,
      note: body.note,
      billId: body.billId,
      externalId: result.externalId,
      steps: [...((body.quoteSteps ?? []) as PaymentStep[]), ...(result.steps ?? [])],
    };
    user.transfers.unshift(transfer);
    user.account.balanceCents -= q.debitCents;

    const bill = body.billId ? user.bills.find((b) => b.id === body.billId && !b.paid) : undefined;
    if (bill) {
      bill.paid = true;
      bill.paidAt = now;
    }
    user.transactions.unshift({
      id: randomUUID(),
      date: now,
      description: `${bill ? bill.name : "Sent"} · ${q.receiverName}`,
      amountCents: -q.debitCents,
      category: bill ? bill.category : "transfer",
      transferId: transfer.id,
    });
    return { transfer, fellBack: result.fellBack, paidBillId: bill?.id ?? null };
  });
}
