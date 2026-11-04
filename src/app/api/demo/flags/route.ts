import { z } from "zod";
import { parseBody, withSession } from "@/lib/server/http";

/** PATCH /api/demo/flags — presenter controls, e.g. simulate a network failure on the next send. */
export async function PATCH(req: Request) {
  return withSession(req, async ({ user }) => {
    const body = await parseBody(req, z.object({ failNextSend: z.boolean() }));
    user.demo.failNextSend = body.failNextSend;
  });
}
