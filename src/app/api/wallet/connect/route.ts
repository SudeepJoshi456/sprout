import { z } from "zod";
import { OpenPaymentsClientError } from "@interledger/open-payments";
import { config, modeStatus } from "@/lib/server/config";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { normalizeWalletAddress } from "@/lib/server/payments";
import { KeySetupError, revokeGrant, startWalletConnect } from "@/lib/server/payments/interledger";
import { PaymentUserError } from "@/lib/server/payments/types";
import { getLinkedWallet, newConnectState, removeLinkedWallet, savePendingConnect } from "@/lib/server/wallet-link";

const schema = z.object({
  walletAddress: z.string().trim().min(1).max(300),
  capCents: z.number().int().min(100).max(500_000).default(50_000),
  returnTo: z.enum(["/profile", "/onboarding", "/move", "/home"]).default("/profile"),
});

/** The public origin, for the wallet to send people back to. */
function appOrigin(req: Request) {
  if (config.appUrl) return config.appUrl;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

/**
 * POST /api/wallet/connect: starts connecting the person's own Interledger
 * wallet. Returns a link to their wallet, where they log in and approve a
 * spending cap. That approval is the proof the wallet is theirs.
 */
export async function POST(req: Request) {
  return withSession(
    req,
    async ({ userId }) => {
      if (modeStatus().payments !== "interledger") {
        throw new ApiError(409, "not_live", "Real wallets aren't set up on this server yet.");
      }
      const body = await parseBody(req, schema);
      const wallet = normalizeWalletAddress(body.walletAddress);
      const state = newConnectState();
      let step = "start";
      try {
        const { redirect, pending } = await startWalletConnect(wallet, body.capCents, `${appOrigin(req)}/api/wallet/callback?state=${state}`);
        step = "save";
        await savePendingConnect(state, { ...pending, userId, returnTo: body.returnTo });
        return { redirect };
      } catch (err) {
        if (step === "save") {
          console.error("[wallet] connect failed saving the pending approval", err);
          throw new ApiError(500, "storage_error", "Sprout couldn't save your approval request (database problem). Please try again.");
        }
        if (err instanceof PaymentUserError) throw new ApiError(422, err.code, err.message);
        console.error("[wallet] connect failed", err);
        // A bad key or key ID makes the wallet's auth server reject Sprout's signed request (401).
        if (err instanceof KeySetupError || (err instanceof OpenPaymentsClientError && err.status === 401)) {
          throw new ApiError(500, "server_key", "Sprout's own wallet key isn't set up correctly on this server, so no wallet can connect yet. Your address is fine.");
        }
        // The wallet answered but refused the request (e.g. a bad return link): show its reason.
        if (err instanceof OpenPaymentsClientError && err.status) {
          throw new ApiError(502, "wallet_refused", `The wallet refused the request (${err.status}${err.description ? `: ${err.description}` : ""}).`);
        }
        throw new ApiError(502, "wallet_unreachable", "We couldn't reach that wallet's server. Check the address and try again.");
      }
    },
    { mutates: false },
  );
}

/** DELETE /api/wallet/connect: disconnects the wallet and cancels Sprout's permission to spend from it. */
export async function DELETE(req: Request) {
  return withSession(req, async ({ userId, user }) => {
    const link = await getLinkedWallet(userId);
    if (link) {
      await revokeGrant(link).catch(() => undefined);
      await removeLinkedWallet(userId);
    }
    user.profile.walletAddress = null;
    user.incoming = undefined;
  });
}
