import type { NextRequest } from "next/server";
import { errorResponse, requireUser } from "@/lib/server/http";
import { normalizeWalletAddress, resolveWallet } from "@/lib/server/payments";
import { findByWallet } from "@/lib/server/users";

/** GET /api/wallet/resolve?address=: checks a wallet exists and returns its currency, plus the Sprout member using it, if any. */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const address = normalizeWalletAddress(req.nextUrl.searchParams.get("address") ?? "");
    const wallet = await resolveWallet(address);
    const owner = await findByWallet(wallet.url);
    const member = owner ? { name: owner.state.profile.fullName || owner.state.profile.preferredName || null, handle: owner.handle } : null;
    return Response.json({ wallet, member });
  } catch (err) {
    return errorResponse(err);
  }
}
