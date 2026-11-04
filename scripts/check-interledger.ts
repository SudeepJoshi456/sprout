/**
 * Checks the live Interledger setup step by step, without moving money:
 *   npm run check-interledger                     # checks wallet, key, grants
 *   npm run check-interledger -- <receiver-url>   # also creates a real 1.00 quote
 */
import { createPrivateKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createAuthenticatedClient, isFinalizedGrantWithAccessToken } from "@interledger/open-payments";

process.loadEnvFile?.(".env");
const env = process.env;

const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const fail = (msg: string, hint?: string): never => {
  console.log(`  ✗ ${msg}${hint ? `\n    → ${hint}` : ""}`);
  process.exit(1);
};

async function main() {
  console.log("Sprout · Interledger check\n");
  if (env.PAYMENTS_MODE !== "interledger") console.log("  ! PAYMENTS_MODE is not 'interledger' — the app will use simulated payments until you set it.\n");

  const clientWallet = env.OP_CLIENT_WALLET_ADDRESS || fail("OP_CLIENT_WALLET_ADDRESS missing", "Copy .env.example to .env and fill it in");
  const keyId = env.OP_KEY_ID || fail("OP_KEY_ID missing", "Test wallet → Settings → Developer Keys");
  const senderWallet = env.OP_SENDER_WALLET_ADDRESS || clientWallet;

  let pem: string;
  if (env.OP_PRIVATE_KEY_PATH) {
    if (!existsSync(env.OP_PRIVATE_KEY_PATH)) fail(`Key file not found at ${env.OP_PRIVATE_KEY_PATH}`);
    pem = readFileSync(env.OP_PRIVATE_KEY_PATH, "utf8");
  } else if (env.OP_PRIVATE_KEY) {
    pem = env.OP_PRIVATE_KEY.includes("BEGIN") ? env.OP_PRIVATE_KEY.replace(/\\n/g, "\n") : Buffer.from(env.OP_PRIVATE_KEY, "base64").toString("utf8");
  } else {
    return fail("No private key", "Set OP_PRIVATE_KEY_PATH=./private.key");
  }
  const key = (() => {
    try {
      return createPrivateKey(pem);
    } catch {
      return fail("Private key couldn't be parsed", "Use the private.key file downloaded from the test wallet");
    }
  })();
  ok("Private key loaded");

  const client = await createAuthenticatedClient({ walletAddressUrl: clientWallet, keyId, privateKey: key }).catch((e) =>
    fail(`Couldn't create the Open Payments client: ${e.message}`),
  );
  const sender = await client.walletAddress.get({ url: senderWallet }).catch(() => fail(`Sender wallet not found: ${senderWallet}`));
  ok(`Sender wallet ${sender.id} holds ${sender.assetCode} (scale ${sender.assetScale})`);
  ok(`Auth server ${sender.authServer}`);

  const quoteGrant = await client.grant
    .request({ url: sender.authServer }, { access_token: { access: [{ type: "quote", actions: ["create", "read"] }] } })
    .catch((e) => fail(`Quote grant refused: ${e.message}`, "Usually a wrong OP_KEY_ID, or the key belongs to another wallet"));
  if (!isFinalizedGrantWithAccessToken(quoteGrant)) return fail("Quote grant needs interaction (unexpected)");
  ok("Signed request accepted — your key and key ID match");

  const grantFile = join(env.DATA_DIR || ".data", "grant.json");
  if (existsSync(grantFile)) ok(`Outgoing-payment grant found in ${grantFile}`);
  else if (env.OP_OUTGOING_ACCESS_TOKEN) ok("Outgoing-payment grant found in env");
  else console.log("  ! No outgoing-payment grant yet → run `npm run setup-grant` to approve sending");

  const receiverUrl = process.argv[2];
  if (receiverUrl) {
    const receiver = await client.walletAddress.get({ url: receiverUrl }).catch(() => fail(`Receiver wallet not found: ${receiverUrl}`));
    const ipGrant = await client.grant.request(
      { url: receiver.authServer },
      { access_token: { access: [{ type: "incoming-payment", actions: ["create", "read", "complete"] }] } },
    );
    if (!isFinalizedGrantWithAccessToken(ipGrant)) return fail("Incoming payment grant needs interaction (unexpected)");
    const incoming = await client.incomingPayment.create(
      { url: receiver.resourceServer, accessToken: ipGrant.access_token.value },
      { walletAddress: receiver.id, metadata: { description: "Sprout check (no money moves)" } },
    );
    ok(`Incoming payment created at receiver: ${incoming.id}`);
    const quote = await client.quote.create(
      { url: sender.resourceServer, accessToken: quoteGrant.access_token.value },
      { walletAddress: sender.id, receiver: incoming.id, method: "ilp", debitAmount: { value: String(10 ** sender.assetScale), assetCode: sender.assetCode, assetScale: sender.assetScale } },
    );
    const show = (a: { value: string; assetCode: string; assetScale: number }) => `${(Number(a.value) / 10 ** a.assetScale).toFixed(2)} ${a.assetCode}`;
    ok(`Quote: send ${show(quote.debitAmount)} → receiver gets ${show(quote.receiveAmount)} (nothing sent)`);
  }
  console.log("\nAll good. Restart the dev server after changing .env.");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
