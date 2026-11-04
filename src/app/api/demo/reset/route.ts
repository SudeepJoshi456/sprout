import { z } from "zod";
import { clientState, errorResponse, getSid, parseBody } from "@/lib/server/http";
import { resetSession } from "@/lib/server/store";

/** POST /api/demo/reset — reseeds both personas for this session. */
export async function POST(req: Request) {
  try {
    const sid = getSid(req);
    const { persona } = await parseBody(req, z.object({ persona: z.enum(["sudeep", "marcus"]).optional() }));
    const db = resetSession(sid, persona ?? "sudeep");
    return Response.json({ state: clientState(db) });
  } catch (err) {
    return errorResponse(err);
  }
}
