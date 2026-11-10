import { ensureDailyInsight } from "@/lib/server/coach";
import { withSession } from "@/lib/server/http";
import { getPriceMap } from "@/lib/server/market";

/** GET /api/state: the signed-in person's full state (+ today's coach insight). */
export async function GET(req: Request) {
  return withSession(req, async ({ user }) => {
    const prices = await getPriceMap(user.portfolio.holdings.map((h) => h.symbol));
    ensureDailyInsight(user, prices);
  });
}
