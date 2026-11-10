import { clearedSessionCookie, destroySession } from "@/lib/server/auth";
import { assertSameOrigin, errorResponse } from "@/lib/server/http";

/** POST /api/auth/logout: ends this session on the server and clears the cookie. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await destroySession(req);
    const res = Response.json({ ok: true });
    res.headers.append("set-cookie", clearedSessionCookie());
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
