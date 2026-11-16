import { z } from "zod";
import { modeStatus } from "@/lib/server/config";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { getQuote } from "@/lib/server/market";
import { createQuote } from "@/lib/server/payments";
import { getLinkedWallet } from "@/lib/server/wallet-link";
import { findByHandle, memberLabel } from "@/lib/server/users";
import { INVEST_MAX_CENTS, INVEST_MIN_CENTS, TREASURY_NAME, getTreasuryLink, newOrder, ownedHolding, treasuryWallet } from "@/lib/server/invest";
import { formatMoney } from "@/lib/format";
import { roundShares } from "@/lib/portfolio";

/**
 * POST /api/invest/quote: prices a buy or sell paid with the person's own wallet.
 * Returns a signed Interledger quote (amount, fee) plus a signed order that locks
 * the share price, for the review screen. Nothing moves yet.
 */
const schema = z.object({
  symbol: z.string().min(1).max(10),
  side: z.enum(["buy", "sell"]),
  amountCents: z.number().int().nonnegative(),
  sellAll: z.boolean().optional(),
  /** Gift the shares to another member by @username (buys only). */
  giftTo: z.string().trim().max(30).optional(),
});

/** Where simulated gifts are "paid" when the server has no live Interledger setup. */
const PRACTICE_TREASURY = "https://ilp.interledger-test.dev/sprout-practice-treasury";

export async function POST(req: Request) {
  return withSession(
    req,
    async ({ userId, user, record }) => {
      const body = await parseBody(req, schema);
      const walletMode = modeStatus().invest === "wallet";
      // Gifts also work with simulated payments, so the feature can be tried without a treasury.
      if (!walletMode && !body.giftTo) throw new ApiError(409, "invest_off", "Investing with your wallet isn't set up on this server yet.");
      const symbol = body.symbol.toUpperCase();

      let recipientId = userId;
      let recipientName = "";
      if (body.giftTo) {
        if (body.side !== "buy") throw new ApiError(400, "invalid_input", "Only buys can be gifts.");
        const friend = await findByHandle(body.giftTo);
        if (!friend) throw new ApiError(404, "not_found", `We couldn't find @${body.giftTo.replace(/^@/, "")} on Sprout. Check the username.`);
        if (friend.id === userId) throw new ApiError(400, "self_gift", "You can't gift a stock to yourself. Buy it instead.");
        recipientId = friend.id;
        recipientName = memberLabel(friend);
      }

      const treasury = walletMode ? treasuryWallet() : PRACTICE_TREASURY;
      const link = walletMode ? await getLinkedWallet(userId) : null;
      const senderWallet = walletMode ? link?.wallet : (user.profile.walletAddress ?? "https://ilp.interledger-test.dev/sprout-practice");
      if (!senderWallet || (walletMode && senderWallet !== user.profile.walletAddress)) {
        throw new ApiError(409, "wallet_not_connected", "Connect your wallet first. Your investments are paid from it.");
      }
      const market = await getQuote(symbol);
      if (!market) throw new ApiError(404, "not_found", `${symbol} isn't available right now.`);
      const price = market.price;

      let amountCents = body.amountCents;
      let shares: number;
      let quote;
      if (body.side === "buy") {
        if (amountCents < INVEST_MIN_CENTS) throw new ApiError(422, "below_minimum", `The smallest buy is ${formatMoney(INVEST_MIN_CENTS)}.`);
        if (amountCents > INVEST_MAX_CENTS) throw new ApiError(422, "above_maximum", `The largest buy on the test network is ${formatMoney(INVEST_MAX_CENTS)}.`);
        shares = roundShares(amountCents / 100 / price);
        quote = await createQuote({ senderWallet, receiverWallet: treasury, receiverName: TREASURY_NAME, senderName: memberLabel(record), amountCents });
      } else {
        const holding = ownedHolding(user, symbol);
        if (!holding) throw new ApiError(422, "exceeds_position", "You don't own any of this yet.");
        const valueCents = Math.floor(holding.shares * price * 100);
        if (body.sellAll) amountCents = valueCents;
        if (amountCents < INVEST_MIN_CENTS) throw new ApiError(422, "below_minimum", `The smallest sale is ${formatMoney(INVEST_MIN_CENTS)}.`);
        if (amountCents > valueCents) throw new ApiError(422, "exceeds_position", "That's more than you own. Try a smaller amount or sell all.");
        shares = body.sellAll ? holding.shares : Math.min(holding.shares, roundShares(amountCents / 100 / price));
        if (!(await getTreasuryLink())) {
          throw new ApiError(503, "treasury_not_ready", "Selling isn't available yet: Sprout's wallet hasn't been approved to pay out. Please try again later.");
        }
        quote = await createQuote({ senderWallet: treasury, receiverWallet: senderWallet, receiverName: memberLabel(record), senderName: TREASURY_NAME, amountCents });
      }
      const order = newOrder({ quoteId: quote.quote.id, userId, symbol, side: body.side, amountCents, shares, price, recipientId });
      return { quote: quote.quote, steps: quote.steps, order, recipientName };
    },
    { mutates: false },
  );
}
