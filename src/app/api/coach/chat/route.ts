import { z } from "zod";
import { underLimit } from "@/lib/server/auth";
import { coachReply } from "@/lib/server/coach-chat";
import { ApiError, parseBody, withSession } from "@/lib/server/http";

/**
 * POST /api/coach/chat: the coach's reply to the latest question. The chat lives
 * in the browser; only the last few turns are sent, and nothing is stored.
 */
const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().trim().min(1).max(600) }))
    .min(1)
    .max(12),
});

export async function POST(req: Request) {
  return withSession(
    req,
    async ({ userId, user }) => {
      const { messages } = await parseBody(req, schema);
      if (messages[messages.length - 1].role !== "user") throw new ApiError(400, "invalid_input", "Ask a question first.");
      if (!(await underLimit(`coach:${userId}`, 40, 3600))) {
        throw new ApiError(429, "rate_limited", "You've asked a lot this hour. Take a break and try again soon, or open a lesson.");
      }
      return { answer: await coachReply(user, messages) };
    },
    { mutates: false },
  );
}
