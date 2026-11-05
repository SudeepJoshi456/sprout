import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { DEMO_BANKS } from "@/data/banks";

/**
 * POST /api/bank/link: connects a demo bank account (simulated). The demo
 * sign-in screen never sends credentials here; only the chosen account.
 * DELETE /api/bank/link: unlinks it.
 */
const schema = z.object({ institutionId: z.string().max(40), mask: z.string().regex(/^\d{4}$/) });

export async function POST(req: Request) {
  return withSession(req, async ({ user }) => {
    const { institutionId, mask } = await parseBody(req, schema);
    const bank = DEMO_BANKS.find((b) => b.id === institutionId);
    const account = bank?.accounts.find((a) => a.mask === mask);
    if (!bank || !account) throw new ApiError(400, "invalid_input", "We couldn't find that bank account.");
    user.linkedBank = { institutionId: bank.id, institution: bank.name, accountName: account.name, mask, linkedAt: new Date().toISOString() };
  });
}

export async function DELETE(req: Request) {
  return withSession(req, async ({ user }) => {
    user.linkedBank = null;
  });
}
