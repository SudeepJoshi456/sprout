import { z } from "zod";
import { clientState, errorResponse, getSid, parseBody } from "@/lib/server/http";
import { loadSession, restoreSession } from "@/lib/server/store";

/**
 * POST /api/session/restore: rehydrates a session from the client's snapshot.
 * Needed on serverless hosts where a new instance doesn't have the session file.
 * The snapshot only contains this browser's own fake demo data.
 */
const schema = z.object({
  snapshot: z.object({
    activePersona: z.enum(["sudeep", "marcus"]),
    users: z.record(z.string(), z.unknown()),
  }),
});

export async function POST(req: Request) {
  try {
    const sid = getSid(req);
    const existing = loadSession(sid);
    if (existing) return Response.json({ state: clientState(existing) });
    const { snapshot } = await parseBody(req, schema);
    const db = restoreSession(sid, snapshot as never);
    return Response.json({ state: clientState(db) });
  } catch (err) {
    return errorResponse(err);
  }
}
