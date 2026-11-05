import { z } from "zod";
import { EDITABLE_CATEGORIES } from "@/data/categories";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import type { CategoryId } from "@/lib/types";

/** PATCH /api/transactions/:id: recategorize a transaction. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/transactions/[id]">) {
  return withSession(req, async ({ user }) => {
    const { id } = await ctx.params;
    const { category } = await parseBody(
      req,
      z.object({ category: z.enum(EDITABLE_CATEGORIES as [CategoryId, ...CategoryId[]]) }),
    );
    const tx = user.transactions.find((t) => t.id === id);
    if (!tx) throw new ApiError(404, "not_found", "We couldn't find that transaction.");
    if (tx.amountCents > 0) throw new ApiError(400, "not_editable", "Money coming in can't be recategorized.");
    tx.category = category;
  });
}
