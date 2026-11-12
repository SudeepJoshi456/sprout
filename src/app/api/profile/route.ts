import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { liveMode, normalizeWalletAddress } from "@/lib/server/payments";
import { setWalletOwner } from "@/lib/server/users";

/** PATCH /api/profile: settings, display currency, name, and (offline mode only) the wallet address. */
const schema = z.object({
  showHomeCurrency: z.boolean().optional(),
  notifications: z
    .object({ bills: z.boolean(), coach: z.boolean(), learning: z.boolean(), transfers: z.boolean() })
    .partial()
    .optional(),
  walletAddress: z.string().trim().nullable().optional(),
  homeCurrency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  preferredName: z.string().trim().min(1).max(60).optional(),
});

export async function PATCH(req: Request) {
  return withSession(req, async ({ userId, user }) => {
    const body = await parseBody(req, schema);
    if (body.showHomeCurrency !== undefined) user.settings.showHomeCurrency = body.showHomeCurrency;
    if (body.notifications) user.settings.notifications = { ...user.settings.notifications, ...body.notifications };
    if (body.homeCurrency !== undefined) user.profile.homeCurrency = body.homeCurrency;
    if (body.walletAddress !== undefined) {
      // Real wallets are connected through the wallet's own approval screen (/api/wallet/connect).
      if (liveMode()) throw new ApiError(400, "use_connect", "Connect your wallet from Profile so your wallet can confirm it's yours.");
      const next = body.walletAddress ? normalizeWalletAddress(body.walletAddress) : null;
      if (next !== user.profile.walletAddress) user.incoming = undefined;
      user.profile.walletAddress = next;
      if (next) await setWalletOwner(next, userId);
    }
    if (body.preferredName) user.profile.preferredName = body.preferredName;
  });
}
