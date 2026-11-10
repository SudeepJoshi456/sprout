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

export const config = {
  paymentsMode: pick<PaymentsMode>(process.env.PAYMENTS_MODE, ["mock", "interledger"], "mock"),
  aiMode: pick<AiMode>(process.env.AI_MODE, ["mock", "live"], "mock"),
  marketMode: pick<MarketMode>(process.env.MARKET_MODE, ["snapshot", "live"], "snapshot"),

  sessionSecret: process.env.SESSION_SECRET || "sprout-dev-secret-change-me",
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

  op: {
    clientWalletAddress: process.env.OP_CLIENT_WALLET_ADDRESS,
    keyId: process.env.OP_KEY_ID,
    privateKey: process.env.OP_PRIVATE_KEY,
    privateKeyPath: process.env.OP_PRIVATE_KEY_PATH,
    senderWalletAddress: process.env.OP_SENDER_WALLET_ADDRESS || process.env.OP_CLIENT_WALLET_ADDRESS,
    outgoingAccessToken: process.env.OP_OUTGOING_ACCESS_TOKEN,
    outgoingManageUrl: process.env.OP_OUTGOING_MANAGE_URL,
    /** Optional real test-network wallets to use for the seeded contacts. */
    roommateWallet: process.env.OP_DEMO_ROOMMATE_WALLET,
    familyWallet: process.env.OP_DEMO_FAMILY_WALLET,
    friendWallet: process.env.OP_DEMO_FRIEND_WALLET,
    /** Real wallets a user can pick to send from or receive into. */
    wallets: parseWallets(process.env.OP_WALLETS, process.env.OP_SENDER_WALLET_ADDRESS || process.env.OP_CLIENT_WALLET_ADDRESS),
    /** Outgoing grants for wallets other than the primary, as JSON {walletUrl: {accessToken, manageUrl}}. */
    extraGrants: parseGrants(process.env.OP_OUTGOING_GRANTS),
  },
};

export interface LiveWalletConfig {
  label: string;
  url: string;
}

/** OP_WALLETS="Sudeep|https://ilp.../a,JJ|https://ilp.../b". Defaults to the primary sender. */
function parseWallets(raw: string | undefined, primary: string | undefined): LiveWalletConfig[] {
  const list = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [label, url] = entry.includes("|") ? entry.split("|") : ["", entry];
      return { label: label.trim(), url: url.trim().replace(/\/$/, "") };
    })
    .filter((w) => w.url.startsWith("https://"))
    .map((w) => ({ ...w, label: w.label || w.url.split("/").pop()! }));
  if (primary && !list.some((w) => w.url === primary)) list.unshift({ label: primary.split("/").pop()!, url: primary });
  return list;
}

function parseGrants(raw: string | undefined): Record<string, { accessToken: string; manageUrl: string }> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, { accessToken: string; manageUrl: string }>;
  } catch {
    console.warn("[config] OP_OUTGOING_GRANTS is not valid JSON; ignoring it");
    return {};
  }
}

/** The modes actually in effect: "interledger" requires credentials, else the mock runs. */
export function modeStatus(): ModeStatus {
  const op = config.op;
  const opReady = Boolean(op.clientWalletAddress && op.keyId && (op.privateKey || op.privateKeyPath) && op.senderWalletAddress);
  return { payments: config.paymentsMode === "interledger" && opReady ? "interledger" : "mock", ai: config.aiMode, market: config.marketMode };
}
