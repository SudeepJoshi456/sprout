import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";

/**
 * Preview of the planned bank connection. In production Sprout would use
 * Plaid Link to connect a bank and the wallet partner would move money by
 * ACH. Here nothing touches a real bank: the link and transfers are simulated
 * and labelled as such in the app.
 */
const INSTITUTIONS = ["Demo Credit Union", "Demo National Bank", "Demo Community Bank"] as const;

const linkSchema = z.object({ institution: z.enum(INSTITUTIONS) });
const transferSchema = z.object({ direction: z.enum(["in", "out"]), amountCents: z.number().int().min(100).max(500_000) });

/** POST /api/bank: "link" a demo bank (simulated Plaid Link). */
export async function POST(req: Request) {
  return withSession(req, async ({ user }) => {
    const { institution } = await parseBody(req, linkSchema);
    const mask = String(1000 + Math.floor(Math.random() * 9000));
    user.bank = { institution, accountName: "Checking", mask, linkedAt: new Date().toISOString(), transfers: [] };
  });
}

/** PATCH /api/bank: simulate adding money from, or cashing out to, the linked bank. */
export async function PATCH(req: Request) {
  return withSession(req, async ({ user }) => {
    if (!user.bank) throw new ApiError(409, "no_bank", "Link a bank first.");
    const { direction, amountCents } = await parseBody(req, transferSchema);
    user.bank.transfers.unshift({ id: randomUUID(), direction, amountCents, at: new Date().toISOString() });
    user.bank.transfers = user.bank.transfers.slice(0, 20);
  });
}

/** DELETE /api/bank: unlink the demo bank. */
export async function DELETE(req: Request) {
  return withSession(req, async ({ user }) => {
    user.bank = undefined;
  });
}
