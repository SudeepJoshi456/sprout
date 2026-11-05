import { getLesson } from "@/lib/server/ai";
import { ApiError, withSession } from "@/lib/server/http";

/** GET /api/lessons/:id: lesson content (AI-personalized when live, prewritten otherwise). */
export async function GET(req: Request, ctx: RouteContext<"/api/lessons/[id]">) {
  return withSession(
    req,
    async ({ user }) => {
      const { id } = await ctx.params;
      const lesson = await getLesson(user, id);
      if (!lesson) throw new ApiError(404, "not_found", "We couldn't find that lesson.");
      return { lesson };
    },
    { mutates: false },
  );
}
