import { z } from "zod";
import { parseBody, withSession } from "@/lib/server/http";
import { normalizeWalletAddress } from "@/lib/server/payments";

/** PATCH /api/profile: settings, display currency, linked wallet. */
const schema = z.object({
  showHomeCurrency: z.boolean().optional(),
  notifications: z
    .object({ bills: z.boolean(), coach: z.boolean(), learning: z.boolean(), transfers: z.boolean() })
    .partial()
    .optional(),
  walletAddress: z.string().trim().nullable().optional(),
  preferredName: z.string().trim().min(1).max(60).optional(),
});

export async function PATCH(req: Request) {
  return withSession(req, async ({ user }) => {
    const body = await parseBody(req, schema);
    if (body.showHomeCurrency !== undefined) user.settings.showHomeCurrency = body.showHomeCurrency;
    if (body.notifications) user.settings.notifications = { ...user.settings.notifications, ...body.notifications };
    if (body.walletAddress !== undefined) {
      user.profile.walletAddress = body.walletAddress ? normalizeWalletAddress(body.walletAddress) : null;
    }
    if (body.preferredName) user.profile.preferredName = body.preferredName;
  });
}
