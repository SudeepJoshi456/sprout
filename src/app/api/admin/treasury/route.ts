import { config, modeStatus } from "@/lib/server/config";
import { ApiError, withSession } from "@/lib/server/http";
import { getTreasuryLink, isAdmin } from "@/lib/server/invest";

/** GET /api/admin/treasury: whether Sprout's investing wallet is set up and approved to pay out. Admins only. */
export async function GET(req: Request) {
  return withSession(
    req,
    async ({ record }) => {
      if (!isAdmin(record.email)) throw new ApiError(403, "forbidden", "Admins only.");
      const link = await getTreasuryLink();
      return {
        treasury: {
          live: modeStatus().invest === "wallet",
          wallet: config.treasuryWallet,
          connected: Boolean(link),
          capMinor: link?.capMinor ?? null,
          assetScale: link?.assetScale ?? null,
          linkedAt: link?.linkedAt ?? null,
        },
      };
    },
    { mutates: false },
  );
}
