/**
 * Pays an existing Open Payments incoming payment from the configured sender
 * wallet (uses the grant from `npm run setup-grant`). Handy for testing
 * Sprout's live receiving without a second person:
 *
 *   npx tsx scripts/pay-incoming.ts <incoming-payment-url>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createAuthenticatedClient, isFinalizedGrantWithAccessToken } from "@interledger/open-payments";

process.loadEnvFile?.(".env");
const env = process.env;

async function main() {
  const target = process.argv[2];
  if (!target) throw new Error("Usage: npx tsx scripts/pay-incoming.ts <incoming-payment-url>");
  const client = await createAuthenticatedClient({
    walletAddressUrl: env.OP_CLIENT_WALLET_ADDRESS!,
    keyId: env.OP_KEY_ID!,
    privateKey: env.OP_PRIVATE_KEY_PATH ? readFileSync(env.OP_PRIVATE_KEY_PATH, "utf8") : env.OP_PRIVATE_KEY!,
  });
  const sender = await client.walletAddress.get({ url: env.OP_SENDER_WALLET_ADDRESS || env.OP_CLIENT_WALLET_ADDRESS! });
  const quoteGrant = await client.grant.request({ url: sender.authServer }, { access_token: { access: [{ type: "quote", actions: ["create", "read"] }] } });
  if (!isFinalizedGrantWithAccessToken(quoteGrant)) throw new Error("Quote grant needs interaction (unexpected)");
  const quote = await client.quote.create(
    { url: sender.resourceServer, accessToken: quoteGrant.access_token.value },
    { walletAddress: sender.id, receiver: target, method: "ilp" },
  );
  console.log(`Quote: send ${Number(quote.debitAmount.value) / 100} ${quote.debitAmount.assetCode} → ${Number(quote.receiveAmount.value) / 100} ${quote.receiveAmount.assetCode}`);
  const grantFile = join(env.DATA_DIR || ".data", "grant.json");
  let grant = JSON.parse(readFileSync(grantFile, "utf8")) as { accessToken: string; manageUrl: string };
  const pay = (accessToken: string) =>
    client.outgoingPayment.create(
      { url: sender.resourceServer, accessToken },
      { walletAddress: sender.id, quoteId: quote.id, metadata: { description: "Sprout receive test" } },
    );
  let payment;
  try {
    payment = await pay(grant.accessToken);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== 401 && status !== 403) throw err;
    // Access tokens expire after a few minutes; rotate and save so the app picks it up too.
    const rotated = await client.token.rotate({ url: grant.manageUrl, accessToken: grant.accessToken });
    grant = { accessToken: rotated.access_token.value, manageUrl: rotated.access_token.manage };
    writeFileSync(grantFile, JSON.stringify(grant));
    console.log("Rotated the expired access token");
    payment = await pay(grant.accessToken);
  }
  console.log(`Outgoing payment created: ${payment.id}`);
}

main().catch((err) => {
  console.error("Failed:", err?.status ?? "", err?.description ?? err?.message ?? err);
  process.exit(1);
});
