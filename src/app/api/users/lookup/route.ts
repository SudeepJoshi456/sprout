import { underLimit } from "@/lib/server/auth";
import { ApiError, errorResponse, requireUser } from "@/lib/server/http";
import { findByHandle } from "@/lib/server/users";

/**
 * GET /api/users/lookup?handle=ana: finds another Sprout member by their exact
 * @username so you can pay them. Exact match only, so the member list can't
 * be browsed, and rate limited per account.
 */
export async function GET(req: Request) {
  try {
    const me = await requireUser(req);
    if (!(await underLimit(`lookup:${me.id}`, 60, 600))) throw new ApiError(429, "rate_limited", "Too many searches. Wait a few minutes and try again.");
    const handle = (new URL(req.url).searchParams.get("handle") ?? "").replace(/^@/, "").toLowerCase();
    if (!/^[\p{L}\p{N}]{1,24}$/u.test(handle)) return Response.json({ user: null });
    const found = await findByHandle(handle);
    if (!found || found.id === me.id || !found.state.profile.walletAddress) return Response.json({ user: null });
    return Response.json({
      user: { name: found.state.profile.fullName || found.state.profile.preferredName, handle: found.handle, walletAddress: found.state.profile.walletAddress },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
