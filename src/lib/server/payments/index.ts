import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { PaymentQuote, PaymentStep, PaymentsMode } from "@/lib/types";
import { config } from "../config";
import { ApiError } from "../http";
import { interledgerConfigured, interledgerProvider } from "./interledger";
import { mockProvider } from "./mock";
import { PaymentUserError, type GrantStore, type PaymentsProvider } from "./types";

/**
 * Payments facade. Uses real Open Payments when the server has Interledger
 * credentials, otherwise the offline simulator. Real payments never quietly
 * turn into simulated ones: if the network fails, the person sees the error.
 */
const QUOTE_TTL_MS = 5 * 60_000;

export function liveMode() {
  return config.paymentsMode === "interledger" && interledgerConfigured();
}

function primary(): PaymentsProvider {
  return liveMode() ? interledgerProvider : mockProvider;
}

/** Accepts https URLs and "$host/path" payment pointers. */
export function normalizeWalletAddress(input: string): string {
  const raw = input.trim();
  const candidate = raw.startsWith("$") ? `https://${raw.slice(1)}` : raw;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new ApiError(400, "invalid_address", "That doesn't look like a wallet address. It should start with https://");
  }
  if (url.protocol !== "https:") {
    throw new ApiError(400, "invalid_address", "Wallet addresses must start with https:// for security.");
  }
  if (!url.hostname.includes(".") || url.pathname.length < 2) {
    throw new ApiError(400, "invalid_address", "That address is missing the wallet name, e.g. https://ilp.example/yourname");
  }
  // The server fetches this URL, so only public domain names are allowed.
  const host = url.hostname.toLowerCase();
  if (url.username || url.password || url.port || /^[\d.]+$/.test(host) || host.startsWith("[") || /\.(local|internal|localhost|lan|home|corp)$/.test(host)) {
    throw new ApiError(400, "invalid_address", "Wallet addresses need a public domain name, e.g. https://ilp.example/yourname");
  }
  return url.toString().replace(/\/$/, "");
}

function sign(q: Omit<PaymentQuote, "signature">) {
  const payload = JSON.stringify([q.id, q.receiver.url, q.receiver.assetCode, q.debitCents, q.feeCents, q.receive.value, q.receive.currency, q.rate, q.expiresAt, q.mode, q.externalQuoteId ?? "", q.senderWallet ?? "", q.incomingPaymentUrl ?? ""]);
  return createHmac("sha256", config.sessionSecret).update(payload).digest("hex");
}

export function verifyQuote(q: PaymentQuote) {
  const expected = Buffer.from(sign(q), "hex");
  const actual = Buffer.from(q.signature ?? "", "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new ApiError(400, "quote_invalid", "This quote couldn't be verified. Please review the payment again.");
  }
  if (Date.parse(q.expiresAt) < Date.now()) {
    throw new ApiError(410, "quote_expired", "This quote expired. We'll get you a fresh one.");
  }
}

function mapError(err: unknown): never {
  if (err instanceof PaymentUserError) throw new ApiError(422, err.code, err.message);
  if (err instanceof ApiError) throw err;
  console.error("[payments] network error", err);
  throw new ApiError(502, "network_error", "We couldn't reach the payment network. No money moved. Please try again.");
}

export async function createQuote(args: {
  senderWallet: string;
  receiverWallet: string;
  receiverName: string;
  amountCents: number;
}): Promise<{ quote: PaymentQuote; steps: PaymentStep[] }> {
  const provider = primary();
  if (args.senderWallet === args.receiverWallet) {
    throw new ApiError(400, "self_send", "That's the wallet you're sending from. Pick someone else to pay.");
  }
  const result = await provider.quote(args).catch(mapError);
  const mode: PaymentsMode = provider.mode;
  const unsigned: Omit<PaymentQuote, "signature"> = {
    id: randomUUID(),
    receiver: result.receiver,
    receiverName: args.receiverName || result.receiver.publicName || "Recipient",
    debitCents: args.amountCents + result.feeCents,
    feeCents: result.feeCents,
    receive: result.receive,
    rate: result.rate,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
    mode,
    externalQuoteId: result.externalQuoteId,
    ...(mode === "interledger" ? { senderWallet: args.senderWallet, incomingPaymentUrl: result.incomingPaymentUrl } : {}),
  };
  return { quote: { ...unsigned, signature: sign(unsigned) }, steps: result.steps };
}

/** In-flight sends by idempotency key, so a double tap can't start two payments. */
const g = globalThis as unknown as { __sproutInflight?: Map<string, Promise<ExecResult>> };
const inflight = (g.__sproutInflight ??= new Map());

interface ExecResult {
  mode: PaymentsMode;
  externalId?: string;
  steps: PaymentStep[];
}

export function executeQuote(q: PaymentQuote, idempotencyKey: string, note: string | undefined, grants: GrantStore | null): Promise<ExecResult> {
  const existing = inflight.get(idempotencyKey);
  if (existing) return existing;
  const run = (async (): Promise<ExecResult> => {
    if (q.mode === "interledger") {
      if (!grants) throw new ApiError(409, "wallet_not_connected", "Connect your wallet in Profile before sending money.");
      const r = await interledgerProvider
        .execute({ externalQuoteId: q.externalQuoteId, senderWallet: q.senderWallet, idempotencyKey, note, grants })
        .catch(mapError);
      return { mode: "interledger", externalId: r.externalId, steps: r.steps };
    }
    const r = await mockProvider.execute({ idempotencyKey });
    return { mode: "mock", steps: r.steps };
  })();
  inflight.set(idempotencyKey, run);
  // Keep successes briefly to absorb duplicate taps; drop failures so a retry can run.
  run.then(
    () => setTimeout(() => inflight.delete(idempotencyKey), 60_000),
    () => inflight.delete(idempotencyKey),
  );
  return run;
}

export async function resolveWallet(url: string) {
  return primary().resolveWallet(url).catch(mapError);
}
