import "server-only";
import { createPrivateKey, type KeyObject } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  createAuthenticatedClient,
  isFinalizedGrantWithAccessToken,
  OpenPaymentsClientError,
  type AuthenticatedClient,
  type WalletAddress,
} from "@interledger/open-payments";
import { FX_PER_USD } from "@/data/fx";
import type { WalletInfo } from "@/lib/types";
import { config } from "../config";
import { kvEnabled, kvGet, kvSet } from "../kv";
import { hostOf, PaymentUserError, StepRecorder, type PaymentsProvider } from "./types";

/**
 * Real Open Payments on the Interledger test network
 * (https://wallet.interledger-test.dev).
 *
 * Flow per payment (see openpayments.dev and interledger/open-payments-snippets):
 *   quote():  resolve wallets → incoming-payment grant + incoming payment on the
 *             receiver → quote grant + quote on the sender
 *   execute(): outgoing payment using the long-lived grant created once by
 *             `npm run setup-grant` (interactive approval in the test wallet).
 */

const GRANT_FILE = join(config.dataDir, "grant.json");

interface OutgoingGrant {
  accessToken: string;
  manageUrl: string;
}

let clientPromise: Promise<AuthenticatedClient> | null = null;
let outgoingGrant: OutgoingGrant | null = null;

function loadPrivateKey(): KeyObject {
  let pem: string | undefined;
  if (config.op.privateKeyPath) pem = readFileSync(config.op.privateKeyPath, "utf8");
  else if (config.op.privateKey) {
    const raw = config.op.privateKey.trim();
    // Accept a PEM with literal "\n", or the base64 blob the test wallet downloads.
    pem = raw.includes("BEGIN") ? raw.replace(/\\n/g, "\n") : Buffer.from(raw, "base64").toString("utf8");
  }
  if (!pem) throw new Error("OP_PRIVATE_KEY or OP_PRIVATE_KEY_PATH is not set");
  return createPrivateKey(pem);
}

export function interledgerConfigured() {
  return Boolean(
    config.op.clientWalletAddress &&
      config.op.keyId &&
      (config.op.privateKey || config.op.privateKeyPath) &&
      config.op.senderWalletAddress,
  );
}

async function client() {
  if (!interledgerConfigured()) throw new Error("Interledger credentials are not configured");
  clientPromise ??= createAuthenticatedClient({
    walletAddressUrl: config.op.clientWalletAddress!,
    keyId: config.op.keyId!,
    privateKey: loadPrivateKey(),
    logLevel: "warn",
    requestTimeoutMs: 8000,
  }).catch((err) => {
    clientPromise = null;
    throw err;
  });
  return clientPromise;
}

const GRANT_KEY = "sprout:outgoing-grant";

async function getOutgoingGrant(): Promise<OutgoingGrant> {
  // Rotation invalidates the old token, so every instance must read the latest one.
  if (kvEnabled) {
    const stored = await kvGet(GRANT_KEY);
    if (stored) return (outgoingGrant = JSON.parse(stored) as OutgoingGrant);
  }
  // Re-read the file each time: scripts (setup-grant, pay-incoming) may have rotated the token.
  if (existsSync(GRANT_FILE)) {
    try {
      outgoingGrant = JSON.parse(readFileSync(GRANT_FILE, "utf8")) as OutgoingGrant;
      return outgoingGrant;
    } catch {
      /* fall through to memory/env */
    }
  }
  if (outgoingGrant) return outgoingGrant;
  if (config.op.outgoingAccessToken && config.op.outgoingManageUrl) {
    outgoingGrant = { accessToken: config.op.outgoingAccessToken, manageUrl: config.op.outgoingManageUrl };
    return outgoingGrant;
  }
  throw new Error("No outgoing payment grant. Run `npm run setup-grant` first.");
}

async function persistGrant(g: OutgoingGrant) {
  outgoingGrant = g;
  if (kvEnabled) await kvSet(GRANT_KEY, JSON.stringify(g));
  try {
    mkdirSync(config.dataDir, { recursive: true });
    writeFileSync(GRANT_FILE, JSON.stringify(g));
  } catch {
    /* memory is enough for this process */
  }
}

async function getWallet(url: string): Promise<WalletAddress> {
  const c = await client();
  try {
    return await c.walletAddress.get({ url });
  } catch (err) {
    if (err instanceof OpenPaymentsClientError && (err.status === 404 || err.status === 400)) {
      throw new PaymentUserError("wallet_not_found", "We couldn't find an Open Payments wallet at that address.");
    }
    throw err;
  }
}

async function nonInteractiveToken(authServer: string, type: "incoming-payment" | "quote") {
  const c = await client();
  const grant = await c.grant.request(
    { url: authServer },
    {
      access_token: {
        access:
          type === "incoming-payment"
            ? [{ type: "incoming-payment", actions: ["create", "read", "complete"] }]
            : [{ type: "quote", actions: ["create", "read"] }],
      },
    },
  );
  if (!isFinalizedGrantWithAccessToken(grant)) throw new Error(`Expected a non-interactive ${type} grant`);
  return grant.access_token.value;
}

const toMinor = (value: string, scale: number) => Math.round(Number(value) / 10 ** (scale - 2));
const fromMinor = (minor: number, scale: number) => String(Math.round(minor * 10 ** (scale - 2)));

/**
 * The app's ledger is in USD, but the real sender wallet may hold another
 * currency (e.g. EUR). Convert at the reference rate in both directions.
 */
function usdToAsset(cents: number, assetCode: string) {
  const rate = FX_PER_USD[assetCode];
  if (!rate) throw new PaymentUserError("unsupported_currency", `Sprout can't send from a ${assetCode} wallet yet.`);
  return Math.round(cents * rate);
}
const assetToUsd = (minor: number, assetCode: string) => Math.round(minor / FX_PER_USD[assetCode]);

const showAmount = (a: { value: string; assetCode: string; assetScale: number }) =>
  `${(Number(a.value) / 10 ** a.assetScale).toFixed(2)} ${a.assetCode}`;

// ---- Receiving on the account holder's own wallet ----------------------------

let ownIncomingToken: { value: string; at: number } | null = null;

/** Grant to create/read/list incoming payments on our own wallet (non-interactive, cached briefly). */
async function ownIncomingAccess(wallet: WalletAddress, fresh = false) {
  if (!fresh && ownIncomingToken && Date.now() - ownIncomingToken.at < 4 * 60_000) return ownIncomingToken.value;
  const c = await client();
  const grant = await c.grant.request(
    { url: wallet.authServer },
    { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "list", "complete"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(grant)) throw new Error("Expected a non-interactive incoming-payment grant");
  ownIncomingToken = { value: grant.access_token.value, at: Date.now() };
  return ownIncomingToken.value;
}

async function withOwnIncoming<T>(fn: (wallet: WalletAddress, token: string) => Promise<T>) {
  const wallet = await getWallet(config.op.senderWalletAddress!);
  try {
    return await fn(wallet, await ownIncomingAccess(wallet));
  } catch (err) {
    if (err instanceof OpenPaymentsClientError && err.status === 401) return fn(wallet, await ownIncomingAccess(wallet, true));
    throw err;
  }
}

/** Creates a real incoming payment on the user's wallet for a payment request. */
export async function createOwnIncomingPayment(amountCents: number, description: string) {
  const c = await client();
  return withOwnIncoming(async (wallet, token) => {
    const ip = await c.incomingPayment.create(
      { url: wallet.resourceServer, accessToken: token },
      {
        walletAddress: wallet.id,
        incomingAmount: { value: fromMinor(usdToAsset(amountCents, wallet.assetCode), wallet.assetScale), assetCode: wallet.assetCode, assetScale: wallet.assetScale },
        expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        metadata: { description: description || "Sprout payment request" },
      },
    );
    return { url: ip.id, wallet: wallet.id };
  });
}

export interface OwnIncomingPayment {
  url: string;
  createdAt: string;
  completed: boolean;
  /** USD cents received so far. */
  receivedCents: number;
  received: { value: number; currency: string };
  description: string | null;
}

/** Most recent incoming payments on the user's wallet. */
export async function listOwnIncomingPayments(): Promise<OwnIncomingPayment[]> {
  const c = await client();
  return withOwnIncoming(async (wallet, token) => {
    const page = await c.incomingPayment.list({ url: wallet.resourceServer, walletAddress: wallet.id, accessToken: token }, { first: 50, "wallet-address": wallet.id });
    return page.result.map((ip) => {
      const minor = toMinor(ip.receivedAmount.value, ip.receivedAmount.assetScale);
      const desc = (ip.metadata as { description?: unknown } | undefined)?.description;
      return {
        url: ip.id,
        createdAt: ip.createdAt,
        completed: ip.completed,
        receivedCents: FX_PER_USD[ip.receivedAmount.assetCode] ? assetToUsd(minor, ip.receivedAmount.assetCode) : minor,
        received: { value: minor, currency: ip.receivedAmount.assetCode },
        description: typeof desc === "string" && desc.trim() ? desc.trim() : null,
      };
    });
  });
}

export const interledgerProvider: PaymentsProvider = {
  mode: "interledger",

  async resolveWallet(url: string): Promise<WalletInfo> {
    const w = await getWallet(url);
    return { url: w.id, assetCode: w.assetCode, publicName: w.publicName ?? null };
  },

  async quote({ senderWallet, receiverWallet, amountCents }) {
    const c = await client();
    const rec = new StepRecorder(false);

    const [sender, receiver] = await rec.run(
      "wallets",
      "Look up both wallet addresses",
      () => Promise.all([getWallet(senderWallet), getWallet(receiverWallet)]),
      ([s, r]) => ({
        detail:
          `Sender holds ${s.assetCode}, receiver holds ${r.assetCode}. Each wallet address tells us its auth server and resource server.` +
          (s.assetCode !== "USD" && FX_PER_USD[s.assetCode]
            ? ` Your $${(amountCents / 100).toFixed(2)} is about ${(usdToAsset(amountCents, s.assetCode) / 100).toFixed(2)} ${s.assetCode} from the sender wallet.`
            : ""),
        server: `${hostOf(s.id)} · ${hostOf(r.id)}`,
      }),
    );
    const sameAsset = sender.assetCode === receiver.assetCode;
    const sendMinor = usdToAsset(amountCents, sender.assetCode);

    const ipToken = await rec.run(
      "incoming-grant",
      "Get permission to create an incoming payment",
      () => nonInteractiveToken(receiver.authServer, "incoming-payment"),
      () => ({ detail: "Non-interactive grant (GNAP) from the receiver's auth server. No user approval needed to receive.", server: hostOf(receiver.authServer) }),
    );
    const incoming = await rec.run(
      "incoming-payment",
      "Create an incoming payment at the receiver",
      () =>
        c.incomingPayment.create(
          { url: receiver.resourceServer, accessToken: ipToken },
          {
            walletAddress: receiver.id,
            // Same currency: the receiver gets exactly what was typed; fees are on top.
            ...(sameAsset
              ? { incomingAmount: { value: fromMinor(sendMinor, receiver.assetScale), assetCode: receiver.assetCode, assetScale: receiver.assetScale } }
              : {}),
            metadata: { description: "Sent with Sprout" },
          },
        ),
      (ip) => ({ detail: `A "bucket" on the receiver's account that this payment will fill: ${ip.id}`, server: hostOf(receiver.resourceServer) }),
    );

    const quoteToken = await rec.run(
      "quote-grant",
      "Get permission to create a quote",
      () => nonInteractiveToken(sender.authServer, "quote"),
      () => ({ detail: "Non-interactive grant from the sender's auth server.", server: hostOf(sender.authServer) }),
    );
    const quote = await rec.run(
      "quote",
      "Ask the network for an exact quote",
      () =>
        c.quote.create(
          { url: sender.resourceServer, accessToken: quoteToken },
          sameAsset
            ? { walletAddress: sender.id, receiver: incoming.id, method: "ilp" }
            : {
                walletAddress: sender.id,
                receiver: incoming.id,
                method: "ilp",
                debitAmount: { value: fromMinor(sendMinor, sender.assetScale), assetCode: sender.assetCode, assetScale: sender.assetScale },
              },
        ),
      (q) => ({
        detail: `You'd send ${showAmount(q.debitAmount)} and they'd receive ${showAmount(q.receiveAmount)}. Valid until ${q.expiresAt ?? "soon"}.`,
        server: hostOf(sender.resourceServer),
      }),
    );

    const debitMinor = toMinor(quote.debitAmount.value, quote.debitAmount.assetScale);
    const debitCents = assetToUsd(debitMinor, sender.assetCode);
    const receiveMinor = toMinor(quote.receiveAmount.value, quote.receiveAmount.assetScale);
    const receiverInfo = { url: receiver.id, assetCode: receiver.assetCode, publicName: receiver.publicName ?? null };
    if (sameAsset) {
      return {
        receiver: receiverInfo,
        feeCents: assetToUsd(Math.max(0, debitMinor - receiveMinor), sender.assetCode),
        receive: { value: receiveMinor, currency: receiver.assetCode },
        rate: null,
        externalQuoteId: quote.id,
        steps: rec.steps,
      };
    }
    // Cross-currency: the network folds its cost into the rate. We show the
    // effective rate and the implied fee vs. the mid-market reference.
    const effectiveRate = receiveMinor / debitCents;
    const mid = FX_PER_USD[receiver.assetCode];
    const impliedFee = mid ? Math.max(0, debitCents - Math.round(receiveMinor / mid)) : 0;
    return {
      receiver: receiverInfo,
      feeCents: impliedFee,
      receive: { value: receiveMinor, currency: receiver.assetCode },
      rate: Math.round(effectiveRate * 10_000) / 10_000,
      externalQuoteId: quote.id,
      steps: rec.steps,
    };
  },

  async execute({ externalQuoteId, idempotencyKey, note }) {
    if (!externalQuoteId) throw new Error("Missing Open Payments quote id");
    const c = await client();
    const rec = new StepRecorder(false);
    const sender = await getWallet(config.op.senderWalletAddress!);
    const create = (accessToken: string) =>
      c.outgoingPayment.create(
        { url: sender.resourceServer, accessToken },
        { walletAddress: sender.id, quoteId: externalQuoteId, metadata: { idempotencyKey, description: note ?? "Sprout payment" } },
      );

    let grant = await rec.run(
      "outgoing-grant",
      "Use the account holder's approved spending grant",
      async () => getOutgoingGrant(),
      (g) => ({
        detail: "Sending needs the account holder's consent. They approved a capped outgoing-payment grant once in their wallet (interactive GNAP grant); Sprout uses that token.",
        server: hostOf(g.manageUrl),
      }),
    );
    const payment = await rec.run(
      "outgoing-payment",
      "Create the outgoing payment",
      async () => {
        try {
          return await create(grant.accessToken);
        } catch (err) {
          // Expired token (the test network answers 403 "Inactive Token"): rotate once and retry.
          if (err instanceof OpenPaymentsClientError && (err.status === 401 || err.status === 403)) {
            // Another instance may already have rotated it; use theirs if so.
            const latest = await getOutgoingGrant();
            if (latest.accessToken !== grant.accessToken) {
              grant = latest;
              return create(grant.accessToken);
            }
            try {
              const rotated = await c.token.rotate({ url: grant.manageUrl, accessToken: grant.accessToken });
              grant = { accessToken: rotated.access_token.value, manageUrl: rotated.access_token.manage };
              await persistGrant(grant);
            } catch (rotateErr) {
              const after = await getOutgoingGrant();
              if (after.accessToken === grant.accessToken) throw rotateErr;
              grant = after;
            }
            return create(grant.accessToken);
          }
          throw err;
        }
      },
      (p) => ({
        detail: `The sender's wallet streams Interledger packets to the incoming payment until it's filled. Payment: ${p.id}`,
        server: hostOf(sender.resourceServer),
      }),
    );
    return { externalId: payment.id, steps: rec.steps };
  },
};
