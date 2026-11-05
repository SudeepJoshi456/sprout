import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { LESSON_META, getPrewrittenLesson } from "@/data/lessons";
import { TICKER_MAP } from "@/data/tickers";
import { LESSON_ICON_NAMES } from "@/lib/lesson-icons";
import type { LessonContent, UserState } from "@/lib/types";
import { config } from "./config";

/**
 * AI lessons, asset explainers, and coach copy.
 *
 * Every call: server-side only, structured JSON validated with zod, cached,
 * guarded by a system prompt plus a post-check, and backed by prewritten
 * content so the demo works with AI_MODE=mock or without a key.
 */

const GUARDRAILS = `You write for Sprout, a money-learning app for people starting from zero in the US financial system: international students, immigrants, and first-time earners.

Rules you must always follow:
- Educational only. Never tell the reader to buy, sell, or hold any specific security, and never say what they "should" invest in.
- Never promise or imply guaranteed returns. Mention that investments can lose value when relevant.
- Plain language at about an 8th-grade reading level. Short sentences. No jargon without a quick explanation.
- Culturally neutral. Don't assume the reader's background, family, religion, or income.
- Explain US-specific terms (SSN, ITIN, credit score, routing number, 401(k), etc.) the first time they appear.
- Use concrete, small-dollar examples a student can relate to.
- No emojis. No exclamation marks in a row. No em dashes. Warm, calm, respectful tone.`;

// ---- Schemas -------------------------------------------------------------

const cardSchema = z.object({
  title: z.string().describe("3-7 words"),
  body: z.string().describe("At most 35 words"),
  icon: z.enum(LESSON_ICON_NAMES),
  tone: z.enum(["green", "yellow", "sky", "peach", "plum"]),
});

const quizSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).describe("2 to 4 options"),
  answerIndex: z.number().int().describe("0-based index of the correct option"),
  explanation: z.string().describe("One sentence"),
});

const lessonOutput = z.object({
  cards: z.array(cardSchema).describe("4 to 7 story cards"),
  quiz: z.array(quizSchema).describe("2 or 3 questions"),
});

/** Stricter checks applied after parsing (JSON schema can't express these). */
const words = (s: string) => s.trim().split(/\s+/).length;
const strictLesson = lessonOutput.superRefine((v, ctx) => {
  if (v.cards.length < 4 || v.cards.length > 7) ctx.addIssue({ code: "custom", message: "4-7 cards" });
  if (v.quiz.length < 2 || v.quiz.length > 3) ctx.addIssue({ code: "custom", message: "2-3 questions" });
  v.cards.forEach((c) => {
    if (words(c.body) > 40) ctx.addIssue({ code: "custom", message: `card over 40 words: ${c.title}` });
  });
  v.quiz.forEach((q) => {
    if (q.options.length < 2 || q.options.length > 4 || q.answerIndex < 0 || q.answerIndex >= q.options.length) {
      ctx.addIssue({ code: "custom", message: "bad quiz options" });
    }
  });
});

const coachOutput = z.object({
  title: z.string().describe("At most 9 words"),
  body: z.string().describe("At most 40 words, ends by pointing to the lesson"),
});

const aboutOutput = z.object({ about: z.string().describe("2-3 sentences, at most 55 words") });

/** Phrases that would cross from education into advice or promises. */
const FORBIDDEN = /\b(you should (buy|sell|invest)|guarantee[ds]?|risk[- ]free|can't lose|will (definitely|surely) (go up|rise)|buy now|sell now)\b/i;

function passesGuardrails(text: string) {
  return !FORBIDDEN.test(text);
}

// ---- Cache ---------------------------------------------------------------

const CACHE_FILE = join(config.dataDir, "ai-cache.json");
const g = globalThis as unknown as { __sproutAi?: Map<string, unknown> };
const cache: Map<string, unknown> = (g.__sproutAi ??= loadCache());

function loadCache() {
  try {
    if (existsSync(CACHE_FILE)) return new Map(Object.entries(JSON.parse(readFileSync(CACHE_FILE, "utf8"))));
  } catch {
    /* start empty */
  }
  return new Map<string, unknown>();
}

/** House style: no em dashes in anything we show, even if the model slips one in. */
function noEmDashes<T>(value: T): T {
  if (typeof value === "string") return value.replace(/\s*—\s*/g, ", ") as T;
  if (Array.isArray(value)) return value.map(noEmDashes) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, noEmDashes(v)])) as T;
  return value;
}

function remember<T>(key: string, raw: T) {
  const value = noEmDashes(raw);
  cache.set(key, value);
  try {
    mkdirSync(config.dataDir, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(cache)));
  } catch {
    /* memory only */
  }
  return value;
}

let anthropic: Anthropic | null = null;
function ai() {
  if (config.aiMode !== "live" || !config.ai.apiKey) return null;
  anthropic ??= new Anthropic({ apiKey: config.ai.apiKey, timeout: config.ai.timeoutMs, maxRetries: 1 });
  return anthropic;
}

export function aiAvailable() {
  return ai() !== null;
}

// ---- Context -------------------------------------------------------------

function learnerContext(user: UserState) {
  const p = user.profile;
  const facts = [
    p.reasons.includes("new_to_us") ? "recently moved to the US" : null,
    p.visaType ? `on a ${p.visaType} visa` : null,
    p.idType === "ssn" ? "has an SSN" : p.idType ? "does not have an SSN yet" : null,
    p.reasons.includes("new_to_money") ? "new to managing money" : null,
    p.reasons.includes("learn_investing") ? "wants to learn investing" : null,
    p.goal ? `goal: ${p.goal.replace(/_/g, " ")}` : null,
    user.budget.period === "semester" ? "budgets by semester as a student" : "budgets monthly",
    `${Object.keys(user.learning.completed).length} lessons completed`,
    user.portfolio.holdings.length ? `practice portfolio has ${user.portfolio.holdings.length} holdings` : "has not started practice investing",
  ].filter(Boolean);
  return facts.join("; ");
}

// ---- Public API ------------------------------------------------------------

export async function getLesson(user: UserState, lessonId: string): Promise<LessonContent | null> {
  const base = getPrewrittenLesson(lessonId);
  const meta = LESSON_META.find((l) => l.id === lessonId);
  if (!base || !meta) return null;
  const client = ai();
  if (!client) return base;

  const key = `lesson:${user.profile.id}:${lessonId}`;
  const hit = cache.get(key) as LessonContent | undefined;
  if (hit) return hit;

  try {
    const msg = await client.messages.parse({
      model: config.ai.model,
      max_tokens: 2000,
      system: GUARDRAILS,
      messages: [
        {
          role: "user",
          content: `Write a bite-sized lesson titled "${meta.title}" (${meta.summary}).
Learner: ${learnerContext(user)}.
Make it feel like a short video: 4-6 story cards, each with a 3-7 word title and a body of at most 35 words, then 2-3 multiple-choice quiz questions that check understanding (not trivia).
Tailor examples to the learner where it helps, without assuming anything not listed.
Use this outline as the factual baseline (rewrite freely, keep facts accurate):
${base.cards.map((c) => `- ${c.title}: ${c.body}`).join("\n")}`,
        },
      ],
      output_config: { format: zodOutputFormat(lessonOutput) },
    });
    const parsed = strictLesson.safeParse(msg.parsed_output);
    if (!parsed.success) throw new Error(`Lesson failed validation: ${parsed.error.issues[0]?.message}`);
    const text = JSON.stringify(parsed.data);
    if (!passesGuardrails(text)) throw new Error("Lesson failed guardrail check");
    return remember<LessonContent>(key, { ...base, cards: parsed.data.cards, quiz: parsed.data.quiz, source: "ai" });
  } catch (err) {
    console.warn(`[ai] lesson ${lessonId} fell back to prewritten`, err);
    return base;
  }
}

export async function explainAsset(symbol: string): Promise<{ about: string; source: "ai" | "prewritten" }> {
  const info = TICKER_MAP[symbol];
  const fallback = { about: info?.about ?? "", source: "prewritten" as const };
  const client = ai();
  if (!client || !info) return fallback;
  const key = `about:${symbol}`;
  const hit = cache.get(key) as { about: string; source: "ai" } | undefined;
  if (hit) return hit;
  try {
    const msg = await client.messages.parse({
      model: config.ai.model,
      max_tokens: 400,
      system: GUARDRAILS,
      messages: [
        {
          role: "user",
          content: `In 2-3 short sentences (max 55 words), explain what ${info.name} (${symbol}, ${info.kind === "etf" ? "a fund" : "a company"}) is and how it makes money, for someone who has never invested. Facts only, no opinions on whether it's a good investment.`,
        },
      ],
      output_config: { format: zodOutputFormat(aboutOutput) },
    });
    const about = msg.parsed_output?.about?.trim();
    if (!about || words(about) > 70 || !passesGuardrails(about)) throw new Error("About failed validation");
    return remember(key, { about, source: "ai" as const });
  } catch (err) {
    console.warn(`[ai] about ${symbol} fell back`, err);
    return fallback;
  }
}

/**
 * Rewrites a rule-based coach insight in a warmer, more specific voice.
 * The rule decides *what* to say (and which lesson); AI only phrases it.
 */
export async function phraseCoach(
  user: UserState,
  draft: { title: string; body: string; lessonTitle: string; facts: string },
): Promise<{ title: string; body: string; source: "ai" | "rule" }> {
  const client = ai();
  if (!client) return { title: draft.title, body: draft.body, source: "rule" };
  try {
    const msg = await client.messages.parse({
      model: config.ai.model,
      max_tokens: 300,
      system: `${GUARDRAILS}\nYou are a friendly practice-investing coach. One short insight, tied to a lesson. This is play money in a simulator.`,
      messages: [
        {
          role: "user",
          content: `Learner: ${learnerContext(user)}.
What just happened: ${draft.facts}
Write a title (max 9 words) and a body (max 40 words) that explains the concept behind this, then points to the lesson "${draft.lessonTitle}". Do not judge the decision or suggest a trade.`,
        },
      ],
      output_config: { format: zodOutputFormat(coachOutput) },
    });
    const out = msg.parsed_output;
    if (!out || words(out.body) > 45 || !passesGuardrails(`${out.title} ${out.body}`)) throw new Error("Coach failed validation");
    return { title: noEmDashes(out.title), body: noEmDashes(out.body), source: "ai" };
  } catch (err) {
    console.warn("[ai] coach fell back to rule copy", err);
    return { title: draft.title, body: draft.body, source: "rule" };
  }
}
