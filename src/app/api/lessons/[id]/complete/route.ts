import { z } from "zod";
import { LESSON_META } from "@/data/lessons";
import { ApiError, parseBody, withSession } from "@/lib/server/http";

/** POST /api/lessons/:id/complete: records completion and quiz score (idempotent). */
export async function POST(req: Request, ctx: RouteContext<"/api/lessons/[id]/complete">) {
  return withSession(req, async ({ user }) => {
    const { id } = await ctx.params;
    if (!LESSON_META.some((l) => l.id === id)) throw new ApiError(404, "not_found", "Unknown lesson.");
    const { score, total } = await parseBody(req, z.object({ score: z.number().int().min(0), total: z.number().int().min(1) }));
    const prev = user.learning.completed[id];
    user.learning.completed[id] = {
      completedAt: prev?.completedAt ?? new Date().toISOString(),
      score: Math.max(prev?.score ?? 0, Math.min(score, total)),
      total,
    };
    // A finished lesson resolves any coach card pointing to it.
    user.coach.forEach((c) => {
      if (c.lessonId === id) c.dismissed = true;
    });
  });
}
