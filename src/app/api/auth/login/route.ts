import { z } from "zod";
import { burnPasswordCheck, clientIp, createSession, sessionCookie, underLimit, verifyPassword } from "@/lib/server/auth";
import { ApiError, assertSameOrigin, clientState, errorResponse, parseBody } from "@/lib/server/http";
import { findAccount, loadUser, normalizeEmail } from "@/lib/server/users";

const schema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

const WRONG = "That email and password don't match. Check them and try again.";

/** POST /api/auth/login: email + password. Same message for unknown email and wrong password. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { email, password } = await parseBody(req, schema);
    const ipOk = await underLimit(`login-ip:${clientIp(req)}`, 30, 900);
    const emailOk = await underLimit(`login-email:${normalizeEmail(email)}`, 10, 900);
    if (!ipOk || !emailOk) {
      throw new ApiError(429, "rate_limited", "Too many attempts. For your security, wait 15 minutes and try again.");
    }
    const account = await findAccount(email);
    if (!account) {
      await burnPasswordCheck(password);
      throw new ApiError(401, "bad_credentials", WRONG);
    }
    if (!(await verifyPassword(password, account.passwordHash))) throw new ApiError(401, "bad_credentials", WRONG);
    const record = await loadUser(account.userId);
    if (!record) throw new ApiError(401, "bad_credentials", WRONG);
    const token = await createSession(record.id);
    const res = Response.json({ state: await clientState(record) });
    res.headers.append("set-cookie", sessionCookie(token));
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
