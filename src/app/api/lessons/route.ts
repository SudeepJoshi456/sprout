import { withSession } from "@/lib/server/http";
import { getPriceMap } from "@/lib/server/market";
import { learningStreak, rankLessons } from "@/lib/personalize";

/** GET /api/lessons — the personalized "For you" feed and learning streak. */
export async function GET(req: Request) {
  return withSession(
    req,
    async ({ user }) => {
      const prices = await getPriceMap(user.portfolio.holdings.map((h) => h.symbol));
      return { lessons: rankLessons(user, prices), streak: learningStreak(user) };
    },
    { mutates: false },
  );
}
