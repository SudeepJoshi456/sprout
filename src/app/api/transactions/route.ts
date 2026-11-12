import { randomUUID } from "node:crypto";
import { z } from "zod";
import { EDITABLE_CATEGORIES } from "@/data/categories";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import type { CategoryId } from "@/lib/types";

const schema = z.object({
  description: z.string().trim().min(1).max(60),
  amountCents: z.number().int().min(1).max(10_000_000),
  category: z.enum(EDITABLE_CATEGORIES as [CategoryId, ...CategoryId[]]),
  date: z.iso.date(),
});

/**
 * POST /api/transactions: adds an expense paid outside the wallet (cash, a
 * card, rent by bank transfer) so the budget sees all spending, not just
 * Interledger payments.
 */
export async function POST(req: Request) {
  return withSession(req, async ({ user }) => {
    const body = await parseBody(req, schema);
    if (user.transactions.filter((t) => t.manual).length >= 1000) throw new ApiError(400, "too_many", "You've added the maximum number of expenses.");
    const today = new Date().toISOString().slice(0, 10);
    if (body.date > today) throw new ApiError(400, "future_date", "Pick today or an earlier date.");
    // Noon UTC keeps the day the same in every US timezone.
    user.transactions.unshift({ id: randomUUID(), date: `${body.date}T12:00:00.000Z`, description: body.description, amountCents: -body.amountCents, category: body.category, manual: true });
  });
}
