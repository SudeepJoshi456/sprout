import "server-only";
import { z } from "zod/v4";
import { BRAND_MAP } from "@/data/brands";
import { LESSON_META } from "@/data/lessons";
import { TICKER_MAP } from "@/data/tickers";
import type { UserState } from "@/lib/types";
import { GUARDRAILS, aiAvailable, noEmDashes, passesGuardrails } from "./ai";
import { generateJson, type ChatTurn } from "./gemini";

/**
 * The Coach tab: answers any money question in plain words. Education only:
 * it explains how to think about a choice, never says what to buy or sell.
 * Uses Gemini when a key is set; otherwise (or if Gemini fails) a short canned
 * answer that points to the right lesson.
 */

export interface CoachReply {
  reply: string;
  lessonId: string | null;
  source: "ai" | "canned";
}

const LESSONS = LESSON_META.map((l) => `${l.id}: ${l.title}`).join("\n");

const replySchema = z.object({
  reply: z.string().describe("The answer, at most 120 words, plain text, no markdown headings"),
  lessonId: z.string().nullable().describe("One lesson id from the list that fits the question, or null"),
});

function context(user: UserState) {
  const brands = user.profile.brands.map((s) => BRAND_MAP[s]?.name ?? s);
  const owned = (user.owned?.holdings ?? []).filter((h) => h.shares > 0).map((h) => TICKER_MAP[h.symbol]?.name ?? h.symbol);
  const practice = user.portfolio.holdings.map((h) => TICKER_MAP[h.symbol]?.name ?? h.symbol);
  return [
    brands.length ? `brands they love: ${brands.join(", ")}` : null,
    owned.length ? `owns small amounts (test money) of: ${owned.join(", ")}` : null,
    practice.length ? `practice portfolio holds: ${practice.join(", ")}` : null,
    `${Object.keys(user.learning.completed).length} lessons completed`,
  ]
    .filter(Boolean)
    .join("; ");
}

const SYSTEM = `${GUARDRAILS}

You are Sprout's money coach for college students who are new to investing. Sprout teaches investing through brands they already love, with small amounts and test money.
- Answer the student's question directly in at most 120 words. Friendly, clear, no lecturing.
- If they ask whether to buy, sell or hold a specific stock, do not answer yes or no. Explain how to think about it: is the company making money, is it growing, what could go wrong, and how much of their money is in one company. You may explain that many beginners use broad index funds to spread risk, without recommending any fund.
- If the question isn't about money, gently steer back to money topics.
- Never ask for or repeat personal details like account numbers or passwords.
- Pick at most one lesson from the list that fits, by id, or null.

Lessons:
${LESSONS}`;

export async function coachReply(user: UserState, history: ChatTurn[]): Promise<CoachReply> {
  const question = history[history.length - 1]?.text ?? "";
  if (aiAvailable()) {
    try {
      const transcript = history.map((t) => `${t.role === "user" ? "Student" : "Coach"}: ${t.text}`).join("\n");
      const out = await generateJson(SYSTEM, `What you know about the student: ${context(user)}.\n\nConversation so far:\n${transcript}\n\nWrite the coach's next reply to the student's last message.`, replySchema, 800);
      const reply = noEmDashes(out.reply.trim());
      if (!reply || !passesGuardrails(reply)) throw new Error("Coach reply failed guardrail check");
      const lessonId = out.lessonId && LESSON_META.some((l) => l.id === out.lessonId) ? out.lessonId : null;
      return { reply, lessonId, source: "ai" };
    } catch (err) {
      console.warn("[coach] Gemini reply fell back to canned", err instanceof Error ? err.message : err);
    }
  }
  return canned(question);
}

/** Short prewritten answers, matched by topic, for when AI is off or fails. */
const CANNED: { match: RegExp; reply: string; lessonId: string }[] = [
  {
    match: /\b(index fund|etf|s&p|voo|diversif)/i,
    reply: "An index fund holds many companies at once. An S&P 500 fund owns a small slice of about 500 big US companies, so one company having a bad year matters much less. That's why many people start with one.",
    lessonId: "index-funds",
  },
  {
    match: /\b(should i|buy|sell|worth it|good (stock|investment)|invest in)\b/i,
    reply: "I can't tell you what to buy, but here's how investors think it through. Is the company making money? Is it growing? What could go wrong? And how much of your money would be in this one company? Many beginners keep any single stock small and spread the rest across a broad index fund.",
    lessonId: "diversification",
  },
  {
    match: /\b(stock|share|own a piece|equity)\b/i,
    reply: "A share is a tiny piece of a company. If the company does well over time, the share can be worth more; if it struggles, it can be worth less. The price moves every day with what people expect next.",
    lessonId: "what-is-a-stock",
  },
  {
    match: /\b(drop|down|crash|lose|losing|dip)\b/i,
    reply: "Prices go up and down, sometimes a lot. A drop doesn't always mean something is wrong with the company. Investing money you won't need for years makes the ups and downs easier to sit through.",
    lessonId: "market-dips",
  },
  {
    match: /\b(compound|grow|long term|retire)/i,
    reply: "Compound growth means your gains can earn gains of their own. Small amounts invested early can grow a lot over many years, which is why starting small still matters.",
    lessonId: "compound-growth",
  },
  {
    match: /\b(credit|score|card)\b/i,
    reply: "Your credit score shows lenders how reliably you pay back money. Paying on time and keeping balances low are the two habits that matter most.",
    lessonId: "credit-new",
  },
  {
    match: /\b(fee|expense ratio|cost)\b/i,
    reply: "Small fees add up over time. A fund that charges 1% a year can cost you far more over decades than one charging 0.05%, so it's worth checking.",
    lessonId: "investing-fees",
  },
];

function canned(question: string): CoachReply {
  const hit = CANNED.find((c) => c.match.test(question));
  if (hit) return { reply: hit.reply, lessonId: hit.lessonId, source: "canned" };
  return {
    reply: "Good question. I can explain how stocks, index funds, risk and fees work, in plain words. Try asking something like \"What does owning a stock mean?\" or \"Why do people buy index funds?\"",
    lessonId: "what-is-a-stock",
    source: "canned",
  };
}
