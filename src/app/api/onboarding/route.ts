import { z } from "zod";
import { BRAND_SYMBOLS, MIN_BRANDS } from "@/data/brands";
import { ApiError, parseBody, withSession } from "@/lib/server/http";
import { normalizeWalletAddress } from "@/lib/server/payments";
import { claimHandle } from "@/lib/server/users";
import type { CoachMessage } from "@/lib/types";

/**
 * POST /api/onboarding: completes the profile for the signed-in account.
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
  goal: z.enum(["emergency_fund", "send_home", "start_investing", "understand_credit"]).default("start_investing"),
  brands: z.array(z.string().refine((s) => BRAND_SYMBOLS.includes(s), "Unknown brand")).max(BRAND_SYMBOLS.length).min(MIN_BRANDS),
});

const WELCOME_LESSON: Record<string, { lessonId: string; title: string; body: string }> = {
  understand_credit: { lessonId: "credit-new", title: "Start with how US credit works", body: "Credit scores trip up almost everyone at first. This 2-minute lesson explains how they work and how to build one safely." },
  send_home: { lessonId: "send-home", title: "See where transfer fees hide", body: "A bad exchange rate can cost more than the fee. This 2-minute lesson shows you how to compare transfers honestly." },
  start_investing: { lessonId: "what-is-a-stock", title: "What owning a brand really means", body: "When you buy a share of a brand you love, you own a tiny piece of the company. This 2-minute lesson shows what that means." },
  emergency_fund: { lessonId: "emergency-fund", title: "Your first $500 cushion", body: "An emergency fund keeps surprises from turning into debt. Here's a simple, student-sized way to start." },
};

export async function POST(req: Request) {
  return withSession(req, async ({ record, user }) => {
    const body = await parseBody(req, schema);
    if (body.idType === "passport" && !body.idCountry) {
      throw new ApiError(400, "invalid_input", "Please choose the country that issued your passport.");
    }
    // A connected (approved) wallet stays; a typed one is only used for receiving until it's approved.
    const wallet = body.walletAddress ? normalizeWalletAddress(body.walletAddress) : user.profile.walletAddress;
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
      brands: [...new Set(body.brands)],
      onboarded: true,
    };
    const pick = WELCOME_LESSON[body.goal];
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

    await claimHandle(record, preferred);
  });
}
