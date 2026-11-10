import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { createQuote, liveMode, normalizeWalletAddress } from "@/lib/server/payments";
import { getLinkedWallet } from "@/lib/server/wallet-link";

/**
 * POST /api/payments/quote: resolves the recipient and returns a signed quote
 * (amount, fee, rate, what they receive) for the review screen. Nothing moves yet.
 * Live payments always come from the person's own connected wallet; their
 * wallet checks the balance and spending cap when the payment is sent.
 */
const schema = z.object({
  receiver: z.string().min(1).max(300),
  amountCents: z.number().int().positive().max(1_000_000),
  name: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  return withSession(
    req,
    async ({ userId, user }) => {
      const body = await parseBody(req, schema);
      const receiverWallet = normalizeWalletAddress(body.receiver);
      const senderWallet = liveMode() ? (await getLinkedWallet(userId))?.wallet : (user.profile.walletAddress ?? "https://ilp.interledger-test.dev/sprout-practice");
      if (!senderWallet || (liveMode() && senderWallet !== user.profile.walletAddress)) {
        throw new ApiError(409, "wallet_not_connected", "Connect your wallet in Profile before sending money.");
      }
      const contact = user.contacts.find((c) => c.walletAddress === receiverWallet);
      const { quote, steps } = await createQuote({
        senderWallet,
        receiverWallet,
        receiverName: body.name || contact?.name || "",
        amountCents: body.amountCents,
      });
      return { quote, steps };
    },
    { mutates: false },
  );
}
