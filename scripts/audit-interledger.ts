/**
 * Read-only: lists the incoming and outgoing payments the test network has
 * for the sender and receiver wallets. Moves no money.
 *
 *   npx tsx scripts/audit-interledger.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAuthenticatedClient, isFinalizedGrantWithAccessToken } from "@interledger/open-payments";

process.loadEnvFile?.(".env");
const env = process.env;

const amt = (a?: { value: string; assetScale: number; assetCode: string }) =>
  a ? `${(Number(a.value) / 10 ** a.assetScale).toFixed(2)} ${a.assetCode}` : "-";

async function main() {
  const client = await createAuthenticatedClient({
    walletAddressUrl: env.OP_CLIENT_WALLET_ADDRESS!,
    keyId: env.OP_KEY_ID!,
    privateKey: env.OP_PRIVATE_KEY_PATH ? readFileSync(env.OP_PRIVATE_KEY_PATH, "utf8") : env.OP_PRIVATE_KEY!,
  });
  const wallets = [env.OP_SENDER_WALLET_ADDRESS!, env.OP_DEMO_FAMILY_WALLET].filter(Boolean) as string[];

  for (const url of wallets) {
    const w = await client.walletAddress.get({ url });
    const g = await client.grant.request({ url: w.authServer }, { access_token: { access: [{ type: "incoming-payment", actions: ["list", "read"] }] } });
    if (!isFinalizedGrantWithAccessToken(g)) throw new Error("Incoming grant needs interaction (unexpected)");
    const list = await client.incomingPayment.list(
      { url: w.resourceServer, walletAddress: w.id, accessToken: g.access_token.value },
      { first: 100, "wallet-address": w.id } as never,
    );
    const paid = list.result.filter((p) => Number(p.receivedAmount.value) > 0);
    console.log(`\nINCOMING to ${url} (${list.result.length} created, ${paid.length} received money)`);
    for (const p of paid) {
      console.log(`  ${p.createdAt}  received ${amt(p.receivedAmount)}  of ${amt(p.incomingAmount)}  ${(p.metadata as { description?: string })?.description ?? ""}`);
    }
  }

  const sender = await client.walletAddress.get({ url: env.OP_SENDER_WALLET_ADDRESS! });
  const grant = JSON.parse(readFileSync(join(env.DATA_DIR || ".data", "grant.json"), "utf8")) as { accessToken: string; manageUrl: string };
  const listOut = (token: string) =>
    client.outgoingPayment.list({ url: sender.resourceServer, walletAddress: sender.id, accessToken: token }, { first: 100, "wallet-address": sender.id } as never);
  try {
    let out;
    try {
      out = await listOut(grant.accessToken);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status !== 401 && status !== 403) throw err;
      const rotated = await client.token.rotate({ url: grant.manageUrl, accessToken: grant.accessToken });
      out = await listOut(rotated.access_token.value);
      const { writeFileSync } = await import("node:fs");
      writeFileSync(join(env.DATA_DIR || ".data", "grant.json"), JSON.stringify({ accessToken: rotated.access_token.value, manageUrl: rotated.access_token.manage }));
    }
    console.log(`\nOUTGOING from ${sender.id} (${out.result.length})`);
    for (const p of out.result) {
      console.log(`  ${p.createdAt}  debit ${amt(p.debitAmount)}  sent ${amt(p.sentAmount)}  failed=${p.failed}  ${(p.metadata as { description?: string })?.description ?? ""}`);
    }
  } catch (err) {
    console.log("\nOUTGOING: could not list (grant may not include list):", (err as { status?: number }).status ?? "", (err as Error).message);
  }
}

main().catch((err) => {
  console.error("Failed:", err?.status ?? "", err?.description ?? err?.message ?? err);
  process.exit(1);
});
