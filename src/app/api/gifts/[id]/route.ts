import { withSession } from "@/lib/server/http";

/** PATCH /api/gifts/:id: marks a received gift as seen, so Home stops showing it. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/gifts/[id]">) {
  const { id } = await ctx.params;
  return withSession(req, async ({ user }) => {
    const gift = user.gifts?.find((g) => g.id === id);
    if (gift) gift.seen = true;
  });
}
