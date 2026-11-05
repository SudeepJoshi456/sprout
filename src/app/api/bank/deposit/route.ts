import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { MAX_DEPOSIT_CENTS } from "@/data/banks";

/**
 * POST /api/bank/deposit: moves money in from the linked bank (simulated,
 * instant). The first deposit opens the Sprout account and assigns its number.
 */
const schema = z.object({ amountCents: z.number().int().positive().max(MAX_DEPOSIT_CENTS) });

export async function POST(req: Request) {
  return withSession(req, async ({ user }) => {
    const { amountCents } = await parseBody(req, schema);
    const bank = user.linkedBank;
    if (!bank) throw new ApiError(409, "no_bank", "Connect a bank before adding money.");

    const opened = !user.account.lastFour;
    if (opened) user.account.lastFour = String(randomInt(1000, 10000));
    user.account.balanceCents += amountCents;
    user.transactions.unshift({
      id: randomUUID(),
      date: new Date().toISOString(),
      description: `Deposit from ${bank.institution} ••${bank.mask}`,
      amountCents,
      category: "income",
    });
    return { deposit: { amountCents, opened, lastFour: user.account.lastFour } };
  });
}
