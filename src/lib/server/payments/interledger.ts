import "server-only";
import { createHash, createPrivateKey, randomBytes, type KeyObject } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  createAuthenticatedClient,
  isFinalizedGrantWithAccessToken,
  isPendingGrant,
  OpenPaymentsClientError,
  type AuthenticatedClient,
  type WalletAddress,
} from "@interledger/open-payments";
import { FX_PER_USD } from "@/data/fx";
import type { WalletInfo } from "@/lib/types";
import { config } from "../config";
import { hostOf, PaymentUserError, StepRecorder, type OutgoingGrant, type PaymentsProvider } from "./types";

/**
 * Real Open Payments on the Interledger test network
 * (https://wallet.interledger-test.dev).
 *
 * Flow per payment (see openpayments.dev and interledger/open-payments-snippets):
 *   quote():  resolve wallets → incoming-payment grant + incoming payment on the
 *             receiver → quote grant + quote on the sender
 *   execute(): outgoing payment using the sender's own grant, which they
 *             approved in their wallet when connecting it to Sprout.
 */

let clientPromise: Promise<AuthenticatedClient> | null = null;

/** Sprout's own key is missing or unreadable: a server setup problem, not the person's wallet. */
export class KeySetupError extends Error {}

/**
 * Rebuilds a PEM however it was pasted into a hosting dashboard: real line
 * breaks, literal "\n", line breaks flattened to spaces, wrapped in quotes,
 * or the base64 blob of the whole file.
 */
function normalizePem(value: string): string {
  let raw = value.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n").trim();
  if (!raw.includes("BEGIN")) raw = Buffer.from(raw, "base64").toString("utf8").trim();
  const m = raw.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!m) return raw;
  const body = m[2].replace(/\s+/g, "");
  return `-----BEGIN ${m[1]}-----\n${body.match(/.{1,64}/g)?.join("\n") ?? ""}\n-----END ${m[1]}-----\n`;
}

function loadPrivateKey(): KeyObject {
  // Prefer the pasted key (Vercel); a key file path only works where the file exists (locally).
  const sources: [string, () => string][] = [];
  if (config.op.privateKey) sources.push(["OP_PRIVATE_KEY", () => config.op.privateKey!]);
  if (config.op.privateKeyPath) sources.push(["OP_PRIVATE_KEY_PATH", () => readFileSync(config.op.privateKeyPath!, "utf8")]);
  if (!sources.length) throw new KeySetupError("OP_PRIVATE_KEY or OP_PRIVATE_KEY_PATH is not set");
  const problems: string[] = [];
  for (const [name, read] of sources) {
    try {
      return createPrivateKey(normalizePem(read()));
    } catch (err) {
      problems.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new KeySetupError(`Sprout's private key could not be loaded (${problems.join("; ")})`);
}

export function interledgerConfigured() {
  return Boolean(config.op.clientWalletAddress && config.op.keyId && (config.op.privateKey || config.op.privateKeyPath));
}

async function client() {
  if (!interledgerConfigured()) throw new Error("Interledger credentials are not configured");
  clientPromise ??= createAuthenticatedClient({
    walletAddressUrl: config.op.clientWalletAddress!,
    keyId: config.op.keyId!,
    privateKey: loadPrivateKey(),
    logLevel: "warn",
    requestTimeoutMs: 8000,
    // Validating responses loads OpenAPI .yaml files from node_modules at runtime,
    // which Vercel's serverless bundle doesn't include (ENOENT). The wallet's own
    // servers still validate every request.
    validateResponses: false,
  }).catch((err) => {
    clientPromise = null;
    throw err;
  });
  return clientPromise;
}

// ---- Connecting a person's own wallet (interactive GNAP grant) ---------------

export interface PendingConnect {
  wallet: string;
  authServer: string;
  assetCode: string;
  assetScale: number;
  capMinor: number;
  nonce: string;
  finishUri: string;
  interactFinish: string;
  continueUri: string;
  continueToken: string;
}

/**
 * Asks the wallet's auth server for a capped outgoing-payment grant. The
 * owner approves it by logging in to their wallet, which also proves the
 * wallet is theirs. Returns the approval link and what's needed to finish.
 */
export async function startWalletConnect(walletUrl: string, capCents: number, finishUri: string) {
  const c = await client();
  const wallet = await getWallet(walletUrl);
  const capMinor = usdToAsset(capCents, wallet.assetCode);
  const nonce = randomBytes(16).toString("hex");
  const grant = await c.grant.request(
    { url: wallet.authServer },
    {
      access_token: {
        access: [
          {
            type: "outgoing-payment",
            actions: ["create", "read", "list"],
            identifier: wallet.id,
            limits: { debitAmount: { value: fromMinor(capMinor, wallet.assetScale), assetCode: wallet.assetCode, assetScale: wallet.assetScale } },
          },
        ],
      },
      interact: { start: ["redirect"], finish: { method: "redirect", uri: finishUri, nonce } },
    },
  );
  if (!isPendingGrant(grant)) throw new Error("Expected an interactive grant");
  const pending: PendingConnect = {
    wallet: wallet.id,
    authServer: wallet.authServer,
    assetCode: wallet.assetCode,
    assetScale: wallet.assetScale,
    capMinor,
    nonce,
    finishUri,
    interactFinish: grant.interact.finish,
    continueUri: grant.continue.uri,
    continueToken: grant.continue.access_token.value,
  };
  return { redirect: grant.interact.redirect, pending };
}

/** Verifies the redirect really came from the wallet's auth server, then collects the token. */
export async function finishWalletConnect(p: PendingConnect, interactRef: string, hash: string): Promise<OutgoingGrant> {
  // openpayments.dev/identity/hash-verification
  const digest = createHash("sha256").update(`${p.nonce}\n${p.interactFinish}\n${interactRef}\n${p.authServer}`).digest();
  const expected = [digest.toString("base64"), digest.toString("base64url")].map((h) => h.replace(/=+$/, ""));
  if (!expected.includes(hash.replace(/=+$/, ""))) throw new PaymentUserError("approval_invalid", "That approval didn't come from your wallet. Please try connecting again.");
  const c = await client();
  const finalized = await c.grant.continue({ url: p.continueUri, accessToken: p.continueToken }, { interact_ref: interactRef });
  if (!isFinalizedGrantWithAccessToken(finalized)) throw new Error("Grant did not return an access token");
  return { accessToken: finalized.access_token.value, manageUrl: finalized.access_token.manage };
}

/** Lets go of a grant when someone disconnects their wallet. */
export async function revokeGrant(g: OutgoingGrant) {
  const c = await client();
  await c.grant.cancel({ url: g.manageUrl, accessToken: g.accessToken }).catch(() => undefined);
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

const ownIncomingTokens = new Map<string, { value: string; at: number }>();

/** Grant to create/read/list incoming payments on a wallet (non-interactive, cached briefly per auth server). */
async function ownIncomingAccess(wallet: WalletAddress, fresh = false) {
  const cached = ownIncomingTokens.get(wallet.authServer);
  if (!fresh && cached && Date.now() - cached.at < 4 * 60_000) return cached.value;
  const c = await client();
  const grant = await c.grant.request(
    { url: wallet.authServer },
    { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "list", "complete"] }] } },
  );
  if (!isFinalizedGrantWithAccessToken(grant)) throw new Error("Expected a non-interactive incoming-payment grant");
  ownIncomingTokens.set(wallet.authServer, { value: grant.access_token.value, at: Date.now() });
  return grant.access_token.value;
}

async function withOwnIncoming<T>(walletUrl: string, fn: (wallet: WalletAddress, token: string) => Promise<T>) {
  const wallet = await getWallet(walletUrl);
  try {
    return await fn(wallet, await ownIncomingAccess(wallet));
  } catch (err) {
    if (err instanceof OpenPaymentsClientError && err.status === 401) return fn(wallet, await ownIncomingAccess(wallet, true));
    throw err;
  }
}

/** Creates a real incoming payment on the user's wallet for a payment request. */
export async function createOwnIncomingPayment(walletUrl: string, amountCents: number, description: string) {
  const c = await client();
  return withOwnIncoming(walletUrl, async (wallet, token) => {
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
export async function listOwnIncomingPayments(walletUrl: string): Promise<OwnIncomingPayment[]> {
  const c = await client();
  return withOwnIncoming(walletUrl, async (wallet, token) => {
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

export interface OwnOutgoingPayment {
  url: string;
  createdAt: string;
  failed: boolean;
  receiver: string;
  /** What left the wallet so far, in the wallet's own currency (minor units, scale 2). */
  sent: { value: number; currency: string };
  description: string | null;
}

/** Most recent payments sent from the user's wallet, read with their own grant (needs the "list" action). */
export async function listOwnOutgoingPayments(walletUrl: string, grants: { get(): Promise<OutgoingGrant>; save(g: OutgoingGrant): Promise<void> }): Promise<OwnOutgoingPayment[]> {
  const c = await client();
  const wallet = await getWallet(walletUrl);
  const list = (accessToken: string) => c.outgoingPayment.list({ url: wallet.resourceServer, walletAddress: wallet.id, accessToken }, { first: 50, "wallet-address": wallet.id });
  let grant = await grants.get();
  let page;
  try {
    page = await list(grant.accessToken);
  } catch (err) {
    if (!(err instanceof OpenPaymentsClientError && (err.status === 401 || err.status === 403))) throw err;
    const rotated = await c.token.rotate({ url: grant.manageUrl, accessToken: grant.accessToken });
    grant = { accessToken: rotated.access_token.value, manageUrl: rotated.access_token.manage };
    await grants.save(grant);
    page = await list(grant.accessToken);
  }
  return page.result.map((op) => {
    const desc = (op.metadata as { description?: unknown } | undefined)?.description;
    return {
      url: op.id,
      createdAt: op.createdAt,
      failed: op.failed ?? false,
      receiver: op.receiver,
      sent: { value: toMinor(op.sentAmount.value, op.sentAmount.assetScale), currency: op.sentAmount.assetCode },
      description: typeof desc === "string" && desc.trim() ? desc.trim() : null,
    };
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
        incomingPaymentUrl: incoming.id,
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
      incomingPaymentUrl: incoming.id,
      steps: rec.steps,
    };
  },

  async execute({ externalQuoteId, senderWallet, idempotencyKey, note, grants }) {
    if (!externalQuoteId) throw new Error("Missing Open Payments quote id");
    if (!senderWallet || !grants) throw new Error("Sending needs the account holder's own wallet grant");
    const c = await client();
    const rec = new StepRecorder(false);
    const sender = await getWallet(senderWallet);
    const getOutgoingGrant = () => grants.get();
    const persistGrant = (g: OutgoingGrant) => grants.save(g);
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
