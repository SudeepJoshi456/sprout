import { z } from "zod";
import { clearedSessionCookie, destroySession, underLimit, verifyPassword } from "@/lib/server/auth";
import { ApiError, errorResponse, parseBody, requireUser } from "@/lib/server/http";
import { revokeGrant } from "@/lib/server/payments/interledger";
import { deleteUser, findAccount } from "@/lib/server/users";
import { getLinkedWallet, removeLinkedWallet } from "@/lib/server/wallet-link";

/**
 * DELETE /api/auth/account: permanently deletes the account and its data,
 * and cancels Sprout's permission to spend from the connected wallet.
 */
export async function DELETE(req: Request) {
  try {
    const record = await requireUser(req);
    const { password } = await parseBody(req, z.object({ password: z.string().min(1).max(200) }));
    if (!(await underLimit(`delete:${record.id}`, 5, 900))) throw new ApiError(429, "rate_limited", "Too many attempts. Wait 15 minutes and try again.");
    const account = await findAccount(record.email);
    if (!account || !(await verifyPassword(password, account.passwordHash))) {
      throw new ApiError(401, "bad_credentials", "That password isn't right.");
    }
    const link = await getLinkedWallet(record.id);
    if (link) {
      await revokeGrant(link).catch(() => undefined);
      await removeLinkedWallet(record.id);
    }
    await deleteUser(record);
    await destroySession(req);
    const res = Response.json({ ok: true });
    res.headers.append("set-cookie", clearedSessionCookie());
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
