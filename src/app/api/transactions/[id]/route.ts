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

/** DELETE /api/transactions/:id: removes an expense the person added by hand. */
export async function DELETE(req: Request, ctx: RouteContext<"/api/transactions/[id]">) {
  return withSession(req, async ({ user }) => {
    const { id } = await ctx.params;
    const i = user.transactions.findIndex((t) => t.id === id);
    if (i < 0) throw new ApiError(404, "not_found", "We couldn't find that transaction.");
    if (!user.transactions[i].manual) throw new ApiError(400, "not_editable", "Only expenses you added yourself can be deleted.");
    user.transactions.splice(i, 1);
  });
}
