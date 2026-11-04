/**
 * One-time setup for real Interledger payments: asks the sender's wallet for
 * an outgoing-payment grant with a spending cap, which the account holder
 * approves in the browser (interactive GNAP grant). Saves the token to
 * .data/grant.json and prints env lines for Vercel.
 *
 *   npm run setup-grant            # cap defaults to 500.00 in the wallet's currency
 *   npm run setup-grant -- 100     # custom cap
 *
 * Needs in .env: OP_CLIENT_WALLET_ADDRESS, OP_KEY_ID, OP_PRIVATE_KEY_PATH (or OP_PRIVATE_KEY),
 * and optionally OP_SENDER_WALLET_ADDRESS (defaults to the client wallet).
 */
import { createHash, createPrivateKey, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { createAuthenticatedClient, isFinalizedGrantWithAccessToken, isPendingGrant } from "@interledger/open-payments";

process.loadEnvFile?.(".env");

const need = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
};

const PORT = 3999;
const CALLBACK = `http://localhost:${PORT}/callback`;

async function main() {
  const clientWallet = need("OP_CLIENT_WALLET_ADDRESS");
  const senderWallet = process.env.OP_SENDER_WALLET_ADDRESS || clientWallet;
  const keyPath = process.env.OP_PRIVATE_KEY_PATH;
  const rawKey = process.env.OP_PRIVATE_KEY;
  const pem = keyPath
    ? readFileSync(keyPath, "utf8")
    : rawKey?.includes("BEGIN")
      ? rawKey.replace(/\\n/g, "\n")
      : Buffer.from(need("OP_PRIVATE_KEY"), "base64").toString("utf8");

  const client = await createAuthenticatedClient({
    walletAddressUrl: clientWallet,
    keyId: need("OP_KEY_ID"),
    privateKey: createPrivateKey(pem),
  });

  const sender = await client.walletAddress.get({ url: senderWallet });
  const cap = Number(process.argv[2] ?? 500);
  const nonce = randomBytes(16).toString("hex");
  console.log(`Sender wallet: ${sender.id} (${sender.assetCode}, scale ${sender.assetScale})`);
  console.log(`Requesting an outgoing-payment grant capped at ${cap.toFixed(2)} ${sender.assetCode}…`);

  const grant = await client.grant.request(
    { url: sender.authServer },
    {
      access_token: {
        access: [
          {
            type: "outgoing-payment",
            actions: ["create", "read", "list"],
            identifier: sender.id,
            limits: { debitAmount: { value: String(Math.round(cap * 10 ** sender.assetScale)), assetCode: sender.assetCode, assetScale: sender.assetScale } },
          },
        ],
      },
      interact: { start: ["redirect"], finish: { method: "redirect", uri: CALLBACK, nonce } },
    },
  );
  if (!isPendingGrant(grant)) throw new Error("Expected an interactive grant");

  const interactRef = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", CALLBACK);
      if (url.pathname !== "/callback") return res.writeHead(404).end();
      const ref = url.searchParams.get("interact_ref");
      const result = url.searchParams.get("result");
      res.writeHead(200, { "content-type": "text/html" });
      if (!ref) {
        res.end("<h1>Grant was not approved.</h1><p>You can close this tab.</p>");
        server.close();
        return reject(new Error(`Grant not approved (${result ?? "no interact_ref"})`));
      }
      // Prove the redirect really came from the auth server (openpayments.dev/identity/hash-verification).
      const digest = createHash("sha256").update(`${nonce}\n${grant.interact.finish}\n${ref}\n${sender.authServer}`).digest();
      const expected = [digest.toString("base64"), digest.toString("base64url")].map((h) => h.replace(/=+$/, ""));
      if (!expected.includes((url.searchParams.get("hash") ?? "").replace(/=+$/, ""))) {
        res.end("<h1>Couldn't verify this approval.</h1><p>Run the setup again.</p>");
        server.close();
        return reject(new Error("Interaction hash mismatch — the redirect did not come from the auth server"));
      }
      res.end("<h1>Approved ✓</h1><p>Sprout can now send payments up to the cap. You can close this tab.</p>");
      server.close();
      resolve(ref);
    });
    server.listen(PORT, () => {
      console.log("\nOpen this link, log in to the test wallet, and approve:\n");
      console.log(`  ${grant.interact.redirect}\n`);
      console.log(`Waiting for approval on ${CALLBACK} …`);
    });
  });

  const finalized = await client.grant.continue(
    { url: grant.continue.uri, accessToken: grant.continue.access_token.value },
    { interact_ref: interactRef },
  );
  if (!isFinalizedGrantWithAccessToken(finalized)) throw new Error("Grant did not return an access token");

  const saved = { accessToken: finalized.access_token.value, manageUrl: finalized.access_token.manage };
  const dataDir = process.env.DATA_DIR || ".data";
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, "grant.json"), JSON.stringify(saved, null, 2));
  console.log(`\nSaved ${join(dataDir, "grant.json")}. For Vercel, add these env vars:\n`);
  console.log(`OP_OUTGOING_ACCESS_TOKEN=${saved.accessToken}`);
  console.log(`OP_OUTGOING_MANAGE_URL=${saved.manageUrl}`);
  console.log("\nThen set PAYMENTS_MODE=interledger and restart the server.");
}

main().catch((err) => {
  console.error("\nSetup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
