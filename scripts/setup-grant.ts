/**
 * Terminal testing tool only (used by pay-incoming and audit-interledger).
 * The app itself asks each person to connect and approve their own wallet.
 *
 * Sets up real Interledger sending for a wallet: asks the wallet's auth server
 * for an outgoing-payment grant with a spending cap, which the wallet's owner
 * approves in the browser (interactive GNAP grant).
 *
 *   npm run setup-grant                          # your wallet, cap 500.00
 *   npm run setup-grant -- 100                   # custom cap
 *   npm run setup-grant -- 500 --wallet https://ilp.interledger-test.dev/jj-sprout
 *
 * The owner approves on their own device? After approving, their browser
 * lands on a localhost page that won't load. They copy that page's address
 * and send it to you, then you run:
 *
 *   npm run setup-grant -- --finish "http://localhost:3999/callback?..." --wallet <same wallet>
 *
 * Saves the token to .data/grant.json (your primary wallet) or
 * .data/grants/<name>.json (others).
 * Needs in .env: OP_CLIENT_WALLET_ADDRESS, OP_KEY_ID, OP_PRIVATE_KEY_PATH (or OP_PRIVATE_KEY).
 */
import { createHash, createPrivateKey, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { createAuthenticatedClient, isFinalizedGrantWithAccessToken, isPendingGrant } from "@interledger/open-payments";

process.loadEnvFile?.(".env");

const need = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env`);
  return v;
};

const PORT = 3999;
const CALLBACK = `http://localhost:${PORT}/callback`;
const dataDir = process.env.DATA_DIR || ".data";

function flag(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

interface Pending {
  wallet: string;
  authServer: string;
  nonce: string;
  finish: string;
  continueUri: string;
  continueToken: string;
}

async function main() {
  const clientWallet = need("OP_CLIENT_WALLET_ADDRESS");
  const primary = (process.env.OP_SENDER_WALLET_ADDRESS || clientWallet).replace(/\/$/, "");
  const walletUrl = (flag("wallet") || primary).replace(/\/$/, "");
  const isPrimary = walletUrl === primary;
  const name = walletUrl.split("/").pop()!;
  const grantFile = isPrimary ? join(dataDir, "grant.json") : join(dataDir, "grants", `${name}.json`);
  const pendingFile = join(dataDir, "pending-grants", `${name}.json`);

  const keyPath = process.env.OP_PRIVATE_KEY_PATH;
  const rawKey = process.env.OP_PRIVATE_KEY;
  const pem = keyPath
    ? readFileSync(keyPath, "utf8")
    : rawKey?.includes("BEGIN")
      ? rawKey.replace(/\\n/g, "\n")
      : Buffer.from(need("OP_PRIVATE_KEY"), "base64").toString("utf8");
  const client = await createAuthenticatedClient({ walletAddressUrl: clientWallet, keyId: need("OP_KEY_ID"), privateKey: createPrivateKey(pem) });

  const complete = async (p: Pending, callbackUrl: string) => {
    const url = new URL(callbackUrl);
    const ref = url.searchParams.get("interact_ref");
    if (!ref) throw new Error(`Grant was not approved (${url.searchParams.get("result") ?? "no interact_ref"})`);
    // Prove the redirect really came from the auth server (openpayments.dev/identity/hash-verification).
    const digest = createHash("sha256").update(`${p.nonce}\n${p.finish}\n${ref}\n${p.authServer}`).digest();
    const expected = [digest.toString("base64"), digest.toString("base64url")].map((h) => h.replace(/=+$/, ""));
    if (!expected.includes((url.searchParams.get("hash") ?? "").replace(/=+$/, ""))) {
      throw new Error("Interaction hash mismatch: the redirect did not come from the auth server");
    }
    const finalized = await client.grant.continue({ url: p.continueUri, accessToken: p.continueToken }, { interact_ref: ref });
    if (!isFinalizedGrantWithAccessToken(finalized)) throw new Error("Grant did not return an access token");
    const saved = { accessToken: finalized.access_token.value, manageUrl: finalized.access_token.manage };
    mkdirSync(dirname(grantFile), { recursive: true });
    writeFileSync(grantFile, JSON.stringify(saved, null, 2));
    rmSync(pendingFile, { force: true });
    console.log(`\nApproved. Saved ${grantFile}.`);
  };

  const finishUrl = flag("finish");
  if (finishUrl) {
    if (!existsSync(pendingFile)) throw new Error(`No pending approval for ${walletUrl}. Start one first (without --finish).`);
    await complete(JSON.parse(readFileSync(pendingFile, "utf8")) as Pending, finishUrl);
    return;
  }

  const wallet = await client.walletAddress.get({ url: walletUrl });
  const capArg = process.argv.slice(2).find((a) => /^\d+(\.\d+)?$/.test(a));
  const cap = Number(capArg ?? 500);
  const nonce = randomBytes(16).toString("hex");
  console.log(`Wallet: ${wallet.id} (${wallet.assetCode}, scale ${wallet.assetScale})`);
  console.log(`Requesting an outgoing-payment grant capped at ${cap.toFixed(2)} ${wallet.assetCode}…`);

  const grant = await client.grant.request(
    { url: wallet.authServer },
    {
      access_token: {
        access: [
          {
            type: "outgoing-payment",
            actions: ["create", "read", "list"],
            identifier: wallet.id,
            limits: { debitAmount: { value: String(Math.round(cap * 10 ** wallet.assetScale)), assetCode: wallet.assetCode, assetScale: wallet.assetScale } },
          },
        ],
      },
      interact: { start: ["redirect"], finish: { method: "redirect", uri: CALLBACK, nonce } },
    },
  );
  if (!isPendingGrant(grant)) throw new Error("Expected an interactive grant");

  const pending: Pending = {
    wallet: wallet.id,
    authServer: wallet.authServer,
    nonce,
    finish: grant.interact.finish,
    continueUri: grant.continue.uri,
    continueToken: grant.continue.access_token.value,
  };
  mkdirSync(dirname(pendingFile), { recursive: true });
  writeFileSync(pendingFile, JSON.stringify(pending));

  console.log(`\nThe owner of ${wallet.id} opens this link, logs in to the test wallet, and approves:\n`);
  console.log(`  ${grant.interact.redirect}\n`);
  console.log(`Waiting for approval on ${CALLBACK} …`);
  console.log(`(Approving on another device? They send you the localhost address they land on; run with --finish "<that address>" --wallet ${wallet.id})`);

  await new Promise<void>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", CALLBACK);
      if (url.pathname !== "/callback") return res.writeHead(404).end();
      complete(pending, url.toString()).then(
        () => {
          res.writeHead(200, { "content-type": "text/html" }).end("<h1>Approved ✓</h1><p>Sprout can now send payments up to the cap. You can close this tab.</p>");
          server.close();
          resolve();
        },
        (err: Error) => {
          res.writeHead(200, { "content-type": "text/html" }).end(`<h1>Not approved</h1><p>${err.message}</p>`);
          server.close();
          reject(err);
        },
      );
    });
    server.listen(PORT);
  });
}

main().catch((err) => {
  console.error("\nSetup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
