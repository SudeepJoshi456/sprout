import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/server/http";
import { normalizeWalletAddress, resolveWallet } from "@/lib/server/payments";

/** GET /api/wallet/resolve?address= — checks a wallet exists and returns its currency. */
export async function GET(req: NextRequest) {
  try {
    const address = normalizeWalletAddress(req.nextUrl.searchParams.get("address") ?? "");
    const wallet = await resolveWallet(address);
    return Response.json({ wallet });
  } catch (err) {
    return errorResponse(err);
  }
}
