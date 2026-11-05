import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";

/** PATCH /api/budget: switch monthly/semester view or change a category limit. */
const schema = z.object({
  period: z.enum(["monthly", "semester"]).optional(),
  category: z
    .object({ id: z.string(), monthlyLimitCents: z.number().int().min(0).max(10_000_000) })
    .optional(),
});

export async function PATCH(req: Request) {
  return withSession(req, async ({ user }) => {
    const body = await parseBody(req, schema);
    if (body.period) user.budget.period = body.period;
    if (body.category) {
      const cat = user.budget.categories.find((c) => c.id === body.category!.id);
      if (!cat) throw new ApiError(404, "not_found", "That budget category doesn't exist.");
      cat.monthlyLimitCents = body.category.monthlyLimitCents;
    }
  });
}
