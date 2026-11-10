import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { connectedWallet } from "@/lib/server/connected";
import { createOwnIncomingPayment } from "@/lib/server/payments/interledger";
import { claimIncoming } from "@/lib/server/store";
import type { PaymentRequest } from "@/lib/types";

/**
 * POST /api/payments/request: creates a shareable payment request link.
 * The link opens Sprout's Send flow prefilled with this wallet and amount.
 */
export async function POST(req: Request) {
  return withSession(req, async ({ userId, user }) => {
    const body = await parseBody(
      req,
      z.object({ amountCents: z.number().int().min(100).max(1_000_000), note: z.string().trim().max(140).default("") }),
    );
    if (!user.profile.walletAddress) throw new ApiError(409, "no_wallet", "Connect your wallet first.");
    const origin = new URL(req.url).origin;
    const params = new URLSearchParams({
      to: user.profile.walletAddress,
      amount: (body.amountCents / 100).toFixed(2),
      name: user.profile.fullName,
      ...(body.note ? { note: body.note } : {}),
    });
    const request: PaymentRequest = {
      id: randomUUID(),
      amountCents: body.amountCents,
      note: body.note,
      createdAt: new Date().toISOString(),
      url: `${origin}/move?${params.toString()}`,
    };
    if (await connectedWallet(userId, user)) {
      try {
        const ip = await createOwnIncomingPayment(user.profile.walletAddress, body.amountCents, body.note || `Request from ${user.profile.fullName}`);
        request.incomingPaymentUrl = ip.url;
        await claimIncoming(ip.url, userId);
        request.receivedCents = 0;
      } catch {
        // The share link still works; it pays the wallet address instead.
      }
    }
    user.requests.unshift(request);
    return { request };
  });
}
