import { withSession } from "@/lib/server/http";

/** POST /api/coach/:id/dismiss */
export async function POST(req: Request, ctx: RouteContext<"/api/coach/[id]/dismiss">) {
  return withSession(req, async ({ user }) => {
    const { id } = await ctx.params;
    const m = user.coach.find((c) => c.id === id);
    if (m) m.dismissed = true;
  });
}
