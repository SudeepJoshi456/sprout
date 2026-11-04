import { randomUUID } from "node:crypto";
import { z } from "zod";
import { formatMoney } from "@/lib/format";
import { coachAfterTrade } from "@/lib/server/coach";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { getPriceMap, getQuote } from "@/lib/server/market";
import { MIN_TRADE_CENTS, applyTrade, roundShares, validateTrade } from "@/lib/portfolio";
import type { Trade } from "@/lib/types";

/**
 * POST /api/trades — a simulated buy or sell with Sprout Seeds (play money).
 * Fills at the latest available (delayed) price. Fractional shares to 6 decimals.
 * No options, shorting, margin, or crypto.
 */
const schema = z.object({
  symbol: z.string().min(1).max(10),
  side: z.enum(["buy", "sell"]),
  amountCents: z.number().int(),
  idempotencyKey: z.string().min(8).max(100),
  /** Sell the whole position (avoids leftover fractions from rounding). */
  sellAll: z.boolean().optional(),
});

const MESSAGES: Record<string, string> = {
  amount_invalid: "Enter an amount greater than zero.",
  below_minimum: `The smallest practice trade is ${formatMoney(MIN_TRADE_CENTS)}.`,
  insufficient_seeds: "You don't have enough Seeds for that. Try a smaller amount.",
  exceeds_position: "That's more than you own. Try a smaller amount or sell all.",
  no_price: "We don't have a price for this right now. Try again in a minute.",
};

export async function POST(req: Request) {
  return withSession(req, async ({ user }) => {
    const body = await parseBody(req, schema);
    const symbol = body.symbol.toUpperCase();
    const existing = user.portfolio.trades.find((t) => t.id === body.idempotencyKey);
    if (existing) return { trade: existing, duplicate: true };

    const quote = await getQuote(symbol);
    if (!quote) throw new ApiError(404, "not_found", `${symbol} isn't available in practice mode.`);

    const holding = user.portfolio.holdings.find((h) => h.symbol === symbol);
    const amountCents =
      body.side === "sell" && body.sellAll && holding ? Math.floor(holding.shares * quote.price * 100) : body.amountCents;
    const err = validateTrade(user.portfolio, body.side, symbol, amountCents, quote.price);
    if (err) throw new ApiError(422, err, MESSAGES[err]);

    const shares =
      body.side === "sell" && body.sellAll && holding ? holding.shares : roundShares(amountCents / 100 / quote.price);
    const trade: Trade = {
      id: body.idempotencyKey || randomUUID(),
      symbol,
      side: body.side,
      amountCents,
      shares,
      price: quote.price,
      at: new Date().toISOString(),
    };
    user.portfolio = applyTrade(user.portfolio, trade);

    const prices = await getPriceMap(user.portfolio.holdings.map((h) => h.symbol).concat(symbol));
    const coach = await coachAfterTrade(user, trade, prices);
    user.coach.unshift(coach);
    return { trade, coach, quote };
  });
}
