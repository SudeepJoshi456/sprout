import { z } from "zod";
import { parseBody, withSession } from "@/lib/server/http";
import { sudeepLoginDefaults } from "@/lib/server/seed";

/** POST /api/session/login — demo "log in" as a persona (skips onboarding). */
export async function POST(req: Request) {
  return withSession(req, async ({ db }) => {
    const { persona } = await parseBody(req, z.object({ persona: z.enum(["sudeep", "marcus"]) }));
    db.activePersona = persona;
    if (persona === "sudeep" && !db.users.sudeep.profile.onboarded) {
      db.users.sudeep = sudeepLoginDefaults(db.users.sudeep);
    }
  });
}
