import { z } from "zod";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { normalizeWalletAddress } from "@/lib/server/payments";
import { interledgerConfigured } from "@/lib/server/payments/interledger";
import { isDemoWallet } from "@/lib/server/payments/mock";
import { config } from "@/lib/server/config";
import type { CoachMessage } from "@/lib/types";

/**
 * POST /api/onboarding: completes signup for the active persona.
 * Identity verification is simulated. Only the last 4 characters of any ID
 * number reach the server; the full number never leaves the browser.
 */
const schema = z.object({
  fullName: z.string().trim().min(1).max(120),
  preferredName: z.string().trim().max(60).optional(),
  reasons: z.array(z.enum(["new_to_us", "new_to_money", "learn_investing"])).min(1),
  idType: z.enum(["ssn", "itin", "passport"]),
  idLast4: z.string().trim().min(2).max(4),
  idCountry: z.string().trim().max(60).optional(),
  visaType: z.enum(["F-1", "J-1", "H-1B", "other"]).optional(),
  schoolEmail: z.union([z.literal(""), z.email()]).optional(),
  walletAddress: z.string().trim().optional(),
  goal: z.enum(["emergency_fund", "send_home", "start_investing", "understand_credit"]),
});

const WELCOME_LESSON: Record<string, { lessonId: string; title: string; body: string }> = {
  understand_credit: { lessonId: "credit-new", title: "Start with how US credit works", body: "Credit scores trip up almost everyone at first. This 2-minute lesson explains how they work and how to build one safely." },
  send_home: { lessonId: "send-home", title: "See where transfer fees hide", body: "A bad exchange rate can cost more than the fee. This 2-minute lesson shows you how to compare transfers honestly." },
  start_investing: { lessonId: "index-funds", title: "Start with index funds", body: "Many people begin with funds that hold hundreds of companies at once. Learn how they work in 3 minutes, then practice." },
  emergency_fund: { lessonId: "emergency-fund", title: "Your first $500 cushion", body: "An emergency fund keeps surprises from turning into debt. Here's a simple, student-sized way to start." },
};

export async function POST(req: Request) {
  return withSession(req, async ({ user }) => {
    const body = await parseBody(req, schema);
    if (body.idType === "passport" && !body.idCountry) {
      throw new ApiError(400, "invalid_input", "Please choose the country that issued your passport.");
    }
    let wallet = body.walletAddress ? normalizeWalletAddress(body.walletAddress) : user.profile.walletAddress;
    // The sample wallet offered during signup isn't real; in live mode link the real one we hold keys for.
    if (wallet && isDemoWallet(wallet) && interledgerConfigured() && config.paymentsMode === "interledger") {
      wallet = config.op.senderWalletAddress ?? wallet;
    }
    const preferred = body.preferredName || body.fullName.split(/\s+/)[0] || body.fullName;
    user.profile = {
      ...user.profile,
      fullName: body.fullName,
      preferredName: preferred,
      reasons: body.reasons,
      idType: body.idType,
      idMasked: `•••• ${body.idLast4.slice(-4)}`,
      idCountry: body.idType === "passport" ? body.idCountry ?? null : "United States",
      visaType: body.idType === "passport" ? body.visaType ?? "other" : null,
      schoolEmail: body.schoolEmail || null,
      verified: true,
      goal: body.goal,
      walletAddress: wallet,
      onboarded: true,
    };
    const reasonsNewToUs = body.reasons.includes("new_to_us");
    const pick = reasonsNewToUs && body.goal !== "send_home" ? WELCOME_LESSON.understand_credit : WELCOME_LESSON[body.goal];
    const welcome: CoachMessage = {
      id: `coach_welcome_${Date.now()}`,
      kind: "welcome",
      title: pick.title,
      body: pick.body,
      lessonId: pick.lessonId,
      createdAt: new Date().toISOString(),
      dismissed: false,
      source: "rule",
    };
    user.coach = [welcome, ...user.coach.filter((c) => c.kind !== "welcome")];
  });
}
