import { z } from "zod";
import { parseBody, withSession } from "@/lib/server/http";
import { sudeepLoginDefaults } from "@/lib/server/seed";

/** POST /api/persona — switch the active demo persona. Each keeps its own progress. */
export async function POST(req: Request) {
  return withSession(req, async ({ db }) => {
    const { persona } = await parseBody(req, z.object({ persona: z.enum(["sudeep", "marcus"]) }));
    db.activePersona = persona;
    if (persona === "sudeep" && !db.users.sudeep.profile.onboarded) {
      db.users.sudeep = sudeepLoginDefaults(db.users.sudeep);
    }
  });
}
