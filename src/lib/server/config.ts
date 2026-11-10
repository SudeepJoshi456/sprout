import "server-only";
import type { AiMode, MarketMode, ModeStatus, PaymentsMode } from "@/lib/types";

/**
 * Server-side configuration. Every secret is read here and nowhere else, and
 * this module is `server-only` so it can never be bundled for the browser.
 * Each mode defaults to its safe (offline) value.
 */
function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

const DEV_SECRET = "sprout-dev-secret-change-me";

export const config = {
  paymentsMode: pick<PaymentsMode>(process.env.PAYMENTS_MODE, ["mock", "interledger"], "mock"),
  aiMode: pick<AiMode>(process.env.AI_MODE, ["mock", "live"], "mock"),
  marketMode: pick<MarketMode>(process.env.MARKET_MODE, ["snapshot", "live"], "snapshot"),

  sessionSecret: process.env.SESSION_SECRET || DEV_SECRET,
  /** Public URL wallets send people back to after approving, e.g. https://sprout.vercel.app. */
  appUrl: process.env.APP_URL?.replace(/\/$/, "") || null,
  dataDir: process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/sprout-data" : ".data"),

  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.AI_MODEL || "claude-sonnet-5-5",
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 25_000),
  },

  market: {
    finnhubKey: process.env.FINNHUB_API_KEY,
    cacheSeconds: Math.max(60, Number(process.env.MARKET_CACHE_SECONDS || 60)),
  },

  /** Sprout's own Open Payments client identity. People connect their own wallets in the app. */
  op: {
    clientWalletAddress: process.env.OP_CLIENT_WALLET_ADDRESS,
    keyId: process.env.OP_KEY_ID,
    privateKey: process.env.OP_PRIVATE_KEY,
    privateKeyPath: process.env.OP_PRIVATE_KEY_PATH,
  },
};

if (process.env.VERCEL && config.sessionSecret === DEV_SECRET) {
  console.error("[config] SESSION_SECRET is not set; payment quotes are signed with a public default");
}

/** The modes actually in effect: "interledger" requires credentials, else the mock runs. */
export function modeStatus(): ModeStatus {
  const op = config.op;
  const opReady = Boolean(op.clientWalletAddress && op.keyId && (op.privateKey || op.privateKeyPath));
  return { payments: config.paymentsMode === "interledger" && opReady ? "interledger" : "mock", ai: config.aiMode, market: config.marketMode };
}
