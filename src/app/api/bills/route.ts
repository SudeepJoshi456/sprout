import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  amountCents: z.number().int().min(1).max(10_000_000),
  dueDate: z.iso.date(),
  category: z.enum(["rent", "phone", "subscriptions", "tuition", "health", "transport", "other"]).default("other"),
});

/** POST /api/bills: adds a bill the person wants to plan for. */
export async function POST(req: Request) {
  return withSession(req, async ({ user }) => {
    const body = await parseBody(req, schema);
    if (user.bills.length >= 50) throw new ApiError(400, "too_many", "You can track up to 50 bills.");
    user.bills.push({ id: randomUUID(), name: body.name, category: body.category, amountCents: body.amountCents, dueDate: body.dueDate, setAsideCents: 0, paid: false });
    user.bills.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  });
}
