import { z } from "zod";
import { formatMoney } from "@/lib/format";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { createQuote, normalizeWalletAddress } from "@/lib/server/payments";

/**
 * POST /api/payments/quote — resolves the recipient and returns a signed quote
 * (amount, fee, rate, what they receive) for the review screen. Nothing moves yet.
 */
const schema = z.object({
  receiver: z.string().min(1).max(300),
  amountCents: z.number().int().positive().max(1_000_000),
  name: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  return withSession(
    req,
    async ({ user }) => {
      const body = await parseBody(req, schema);
      const receiverWallet = normalizeWalletAddress(body.receiver);
      if (!user.profile.walletAddress) {
        throw new ApiError(409, "no_wallet", "Connect your wallet in Profile before sending money.");
      }
      if (receiverWallet === user.profile.walletAddress) {
        throw new ApiError(400, "self_send", "That's your own wallet. Pick someone else to pay.");
      }
      const contact = user.contacts.find((c) => c.walletAddress === receiverWallet);
      const { quote, fellBack, steps } = await createQuote({
        senderWallet: user.profile.walletAddress,
        receiverWallet,
        receiverName: body.name || contact?.name || "",
        amountCents: body.amountCents,
      });
      if (quote.debitCents > user.account.balanceCents) {
        throw new ApiError(
          422,
          "insufficient_funds",
          `You have ${formatMoney(user.account.balanceCents)} available. This payment needs ${formatMoney(quote.debitCents)} including fees.`,
        );
      }
      return { quote, fellBack, steps };
    },
    { mutates: false },
  );
}
