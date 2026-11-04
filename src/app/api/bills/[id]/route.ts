import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";

/** PATCH /api/bills/:id — change how much is set aside for a bill. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/bills/[id]">) {
  return withSession(req, async ({ user }) => {
    const { id } = await ctx.params;
    const { setAsideCents } = await parseBody(req, z.object({ setAsideCents: z.number().int().min(0) }));
    const bill = user.bills.find((b) => b.id === id);
    if (!bill) throw new ApiError(404, "not_found", "We couldn't find that bill.");
    if (bill.paid) throw new ApiError(409, "already_paid", "This bill is already paid.");
    bill.setAsideCents = Math.min(setAsideCents, bill.amountCents);
  });
}
