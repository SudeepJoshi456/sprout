import { requireUser } from "@/lib/server/http";
import { finishWalletConnect } from "@/lib/server/payments/interledger";
import { saveUser } from "@/lib/server/users";
import { saveLinkedWallet, takePendingConnect } from "@/lib/server/wallet-link";

/**
 * GET /api/wallet/callback: the wallet sends people here after they approve
 * (or decline). The approval must belong to the signed-in account, and its
 * hash must check out against the wallet's auth server.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (path: string, status: "connected" | "failed" | "declined") => Response.redirect(new URL(`${path}?wallet=${status}`, url), 303);

  const state = url.searchParams.get("state") ?? "";
  const pending = /^[A-Za-z0-9_-]{20,64}$/.test(state) ? await takePendingConnect(state) : null;
  if (!pending) return back("/profile", "failed");

  let record;
  try {
    record = await requireUser(req);
  } catch {
    return back("/login", "failed");
  }
  if (record.id !== pending.userId) return back(pending.returnTo, "failed");

  const ref = url.searchParams.get("interact_ref");
  const hash = url.searchParams.get("hash");
  if (!ref || !hash) return back(pending.returnTo, "declined");

  try {
    const grant = await finishWalletConnect(pending, ref, hash);
    await saveLinkedWallet(record.id, {
      ...grant,
      wallet: pending.wallet,
      assetCode: pending.assetCode,
      assetScale: pending.assetScale,
      capMinor: pending.capMinor,
      linkedAt: new Date().toISOString(),
    });
    if (record.state.profile.walletAddress !== pending.wallet) record.state.incoming = undefined;
    record.state.profile.walletAddress = pending.wallet;
    await saveUser(record);
    return back(pending.returnTo, "connected");
  } catch (err) {
    console.error("[wallet] approval could not be completed", err);
    return back(pending.returnTo, "failed");
  }
}
