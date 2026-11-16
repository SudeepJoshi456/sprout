import "server-only";
import { z } from "zod/v4";
import { config } from "./config";

/**
 * Minimal Google Gemini client (REST, no SDK). Server-side only: the API key
 * never reaches the browser. Two calls: JSON output validated with zod, and a
 * plain-text chat reply.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export function geminiReady() {
  return config.aiMode === "live" && Boolean(config.ai.apiKey);
}

interface GenerateResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

async function generate(body: Record<string, unknown>): Promise<string> {
  if (!geminiReady()) throw new Error("Gemini is not configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);
  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(config.ai.model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": config.ai.apiKey! },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      // Never log the request: it can hold the person's question.
      throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const data = (await res.json()) as GenerateResponse;
    if (data.promptFeedback?.blockReason) throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!text) throw new Error(`Gemini returned no text (${data.candidates?.[0]?.finishReason ?? "unknown"})`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Asks for JSON matching `schema` (described in the prompt) and validates it. */
export async function generateJson<T>(system: string, prompt: string, schema: z.ZodType<T>, maxTokens = 1500): Promise<T> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  const text = await generate({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: `${prompt}\n\nReply with JSON only, matching this JSON Schema:\n${jsonSchema}` }] }],
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: maxTokens, temperature: 0.6 },
  });
  return schema.parse(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
}

/** A chat reply in plain text. */
export async function chatReply(system: string, history: ChatTurn[], maxTokens = 600): Promise<string> {
  return generate({
    systemInstruction: { parts: [{ text: system }] },
    contents: history.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] })),
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  });
}
