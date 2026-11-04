import { withSession } from "@/lib/server/http";

/** POST /api/walkthroughs/:id — marks an interactive walkthrough as finished. */
export async function POST(req: Request, ctx: RouteContext<"/api/walkthroughs/[id]">) {
  return withSession(req, async ({ user }) => {
    const { id } = await ctx.params;
    if (!user.learning.walkthroughs.includes(id)) user.learning.walkthroughs.push(id);
  });
}
