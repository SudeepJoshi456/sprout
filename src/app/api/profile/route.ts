import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { liveWallets, normalizeWalletAddress } from "@/lib/server/payments";

/** PATCH /api/profile: settings, display currency, linked wallet, and which real wallet to send from. */
const schema = z.object({
  showHomeCurrency: z.boolean().optional(),
  notifications: z
    .object({ bills: z.boolean(), coach: z.boolean(), learning: z.boolean(), transfers: z.boolean() })
    .partial()
    .optional(),
  walletAddress: z.string().trim().nullable().optional(),
  sendFrom: z.string().trim().nullable().optional(),
  preferredName: z.string().trim().min(1).max(60).optional(),
});

export async function PATCH(req: Request) {
  return withSession(req, async ({ user }) => {
    const body = await parseBody(req, schema);
    if (body.showHomeCurrency !== undefined) user.settings.showHomeCurrency = body.showHomeCurrency;
    if (body.notifications) user.settings.notifications = { ...user.settings.notifications, ...body.notifications };
    if (body.walletAddress !== undefined) {
      const next = body.walletAddress ? normalizeWalletAddress(body.walletAddress) : null;
      // A different receiving wallet starts fresh, so its older payments aren't credited.
      if (next !== user.profile.walletAddress) user.incoming = undefined;
      user.profile.walletAddress = next;
    }
    if (body.sendFrom !== undefined) {
      const wallet = body.sendFrom ? normalizeWalletAddress(body.sendFrom) : null;
      if (wallet && !liveWallets().some((w) => w.url === wallet && w.canSend)) {
        throw new ApiError(400, "invalid_input", "Sprout doesn't have permission to send from that wallet yet.");
      }
      user.sendFrom = wallet;
    }
    if (body.preferredName) user.profile.preferredName = body.preferredName;
  });
}
