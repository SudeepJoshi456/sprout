import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { PaymentQuote, PaymentStep, PaymentsMode } from "@/lib/types";
import { config } from "../config";
import { ApiError } from "../http";
import { interledgerConfigured, interledgerProvider } from "./interledger";
import { isDemoWallet, mockProvider } from "./mock";
import { PaymentUserError, type PaymentsProvider } from "./types";

/**
 * Payments facade. Picks the provider for PAYMENTS_MODE and falls back to the
 * mock on any infrastructure error, so the demo never breaks. User errors
 * (bad address) are surfaced as-is.
 */
const QUOTE_TTL_MS = 5 * 60_000;

function primary(): PaymentsProvider {
  return config.paymentsMode === "interledger" && interledgerConfigured() ? interledgerProvider : mockProvider;
}

/** Receiving is live only for the real wallet we hold keys for. */
export function receivingLive(walletAddress: string | null | undefined) {
  return primary() === interledgerProvider && Boolean(walletAddress) && walletAddress === config.op.senderWalletAddress;
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
  return url.toString().replace(/\/$/, "");
}

function sign(q: Omit<PaymentQuote, "signature">) {
  const payload = JSON.stringify([q.id, q.receiver.url, q.receiver.assetCode, q.debitCents, q.feeCents, q.receive.value, q.receive.currency, q.rate, q.expiresAt, q.mode, q.externalQuoteId ?? ""]);
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

function mapUserError(err: unknown): never {
  if (err instanceof PaymentUserError) throw new ApiError(422, err.code, err.message);
  throw err;
}

export async function createQuote(args: {
  senderWallet: string;
  receiverWallet: string;
  receiverName: string;
  amountCents: number;
}): Promise<{ quote: PaymentQuote; fellBack: boolean; steps: PaymentStep[] }> {
  const provider = primary();
  let fellBack = false;
  let result;
  try {
    // Live payments always debit the wallet whose key and grant we hold.
    result = await provider.quote(provider === interledgerProvider ? { ...args, senderWallet: config.op.senderWalletAddress! } : args);
  } catch (err) {
    const demoContact = err instanceof PaymentUserError && err.code === "wallet_not_found" && isDemoWallet(args.receiverWallet);
    if ((err instanceof PaymentUserError && !demoContact) || provider === mockProvider) mapUserError(err);
    console.warn("[payments] interledger quote failed, falling back to mock", err);
    fellBack = true;
    try {
      result = await mockProvider.quote(args);
    } catch (e) {
      mapUserError(e);
    }
  }
  const mode: PaymentsMode = fellBack ? "mock" : provider.mode;
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
  };
  return { quote: { ...unsigned, signature: sign(unsigned) }, fellBack, steps: result.steps };
}

/** In-flight sends by idempotency key, so a double tap can't start two payments. */
const g = globalThis as unknown as { __sproutInflight?: Map<string, Promise<ExecResult>> };
const inflight = (g.__sproutInflight ??= new Map());

interface ExecResult {
  mode: PaymentsMode;
  externalId?: string;
  fellBack: boolean;
  steps: PaymentStep[];
}

export function executeQuote(q: PaymentQuote, idempotencyKey: string, note?: string): Promise<ExecResult> {
  const existing = inflight.get(idempotencyKey);
  if (existing) return existing;
  const run = (async (): Promise<ExecResult> => {
    if (q.mode === "interledger") {
      try {
        const r = await interledgerProvider.execute({ externalQuoteId: q.externalQuoteId, idempotencyKey, note });
        return { mode: "interledger", externalId: r.externalId, fellBack: false, steps: r.steps };
      } catch (err) {
        console.warn("[payments] interledger send failed, completing as simulated", err);
        const r = await mockProvider.execute({ idempotencyKey });
        return { mode: "mock", fellBack: true, steps: r.steps };
      }
    }
    const r = await mockProvider.execute({ idempotencyKey });
    return { mode: "mock", fellBack: false, steps: r.steps };
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
  const provider = primary();
  try {
    return await provider.resolveWallet(url);
  } catch (err) {
    if ((err instanceof PaymentUserError && !isDemoWallet(url)) || provider === mockProvider) mapUserError(err);
    return mockProvider.resolveWallet(url).catch(mapUserError);
  }
}
