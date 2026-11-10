import "server-only";
import { randomUUID } from "node:crypto";
import { FX_PER_USD, usdToForeign } from "@/data/fx";
import type { WalletInfo } from "@/lib/types";
import { sleep } from "../http";
import { hostOf, PaymentUserError, StepRecorder, type PaymentsProvider } from "./types";

/**
 * Simulated Open Payments. Same shapes, same steps, and realistic latency as
 * the real provider, so the receipt explains the identical flow.
 *
 * Only used when the server has no Interledger credentials. Any valid https
 * URL resolves as a USD wallet (or the currency hinted by its name), except
 * URLs containing "notfound", which simulate a wallet that doesn't exist.
 */

/** Cross-currency network fee in the mock: 0.3%, shown to the user. */
const FX_FEE_RATE = 0.003;

const authHost = (walletUrl: string) => `auth.${hostOf(walletUrl).replace(/^ilp\./, "")}`;

export const mockProvider: PaymentsProvider = {
  mode: "mock",

  async resolveWallet(url: string): Promise<WalletInfo> {
    await sleep(250);
    if (/notfound/i.test(url)) {
      throw new PaymentUserError("wallet_not_found", "We couldn't find a wallet at that address. Check for typos and try again.");
    }
    const slug = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    // Hint currency from the address for demos, e.g. ".../carlos-mxn".
    const hint = slug.match(/-(npr|inr|eur|mxn|gbp|ngn|php)$/i)?.[1]?.toUpperCase();
    return { url, assetCode: hint ?? "USD", publicName: null };
  },

  async quote({ senderWallet, receiverWallet, amountCents }) {
    const rec = new StepRecorder(true);
    const receiver = await rec.run(
      "wallets",
      "Look up both wallet addresses",
      () => this.resolveWallet(receiverWallet),
      (r) => ({
        detail: `Sender holds USD, receiver holds ${r.assetCode}. Each wallet address tells us its auth server and resource server.`,
        server: `${hostOf(senderWallet)} · ${hostOf(r.url)}`,
      }),
    );
    if (receiver.assetCode !== "USD" && !FX_PER_USD[receiver.assetCode]) {
      throw new PaymentUserError("unsupported_currency", `Sending to ${receiver.assetCode} wallets isn't supported yet.`);
    }
    const sameAsset = receiver.assetCode === "USD";
    const feeCents = sameAsset ? 0 : Math.max(1, Math.round(amountCents * FX_FEE_RATE));
    const receive = sameAsset ? { value: amountCents, currency: "USD" } : { value: usdToForeign(amountCents, receiver.assetCode), currency: receiver.assetCode };
    const ipId = `${receiver.url.replace(/\/[^/]*$/, "")}/incoming-payments/${randomUUID()}`;

    await rec.run("incoming-grant", "Get permission to create an incoming payment", () => sleep(90), () => ({
      detail: "Non-interactive grant (GNAP) from the receiver's auth server. No user approval needed to receive.",
      server: authHost(receiver.url),
    }));
    await rec.run("incoming-payment", "Create an incoming payment at the receiver", () => sleep(120), () => ({
      detail: `A "bucket" on the receiver's account that this payment will fill: ${ipId}`,
      server: hostOf(receiver.url),
    }));
    await rec.run("quote-grant", "Get permission to create a quote", () => sleep(80), () => ({
      detail: "Non-interactive grant from the sender's auth server.",
      server: authHost(senderWallet),
    }));
    await rec.run("quote", "Ask the network for an exact quote", () => sleep(160), () => ({
      detail: `You'd send ${((amountCents + feeCents) / 100).toFixed(2)} USD and they'd receive ${(receive.value / 100).toFixed(2)} ${receive.currency}. Valid for 5 minutes.`,
      server: hostOf(senderWallet),
    }));

    return { receiver, feeCents, receive, rate: sameAsset ? null : FX_PER_USD[receiver.assetCode], steps: rec.steps };
  },

  async execute() {
    const rec = new StepRecorder(true);
    await rec.run("outgoing-grant", "Use the account holder's approved spending grant", () => sleep(150), () => ({
      detail: "Sending needs the account holder's consent. They approved a capped outgoing-payment grant once in their wallet (interactive GNAP grant); Sprout uses that token.",
      server: "auth.interledger-test.dev",
    }));
    // ~1.3s like a real Interledger payment settling.
    await rec.run("outgoing-payment", "Create the outgoing payment", () => sleep(1300), () => ({
      detail: `The sender's wallet streams Interledger packets to the incoming payment until it's filled. Payment: https://ilp.interledger-test.dev/outgoing-payments/${randomUUID()}`,
      server: "ilp.interledger-test.dev",
    }));
    return { steps: rec.steps };
  },
};
