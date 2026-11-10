// Send & Receive between two brand-new accounts in headless Chrome, with
// simulated payments (server without Interledger keys). Moves no real money.
// Usage: node scripts/e2e-move.mjs  (server on BASE, default :3100)
import { chromium } from "playwright";
import { signUpAndOnboard } from "./e2e-helpers.mjs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "chrome" });
const problems = [];
const watch = (p) => {
  p.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  p.on("response", (r) => r.status() >= 400 && ![404, 409, 422, 502, 503].includes(r.status()) && problems.push(`http ${r.status()} ${r.url()}`));
};
const other = await (await browser.newContext()).newPage();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
watch(other);
watch(page);

const main = () => page.locator("main").first();
const step = async (name, fn) => {
  process.stdout.write(`- ${name} … `);
  try {
    await fn();
    console.log("ok");
  } catch (e) {
    console.log("FAILED\n   ", e.message.split("\n")[0]);
    console.log("    screen:", (await main().innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 600));
    process.exitCode = 1;
  }
};

let handle = "";
await step("a second person signs up and adds a wallet address", async () => {
  await signUpAndOnboard(other, BASE, { fullName: "Daniel Kim", preferred: "Daniel" });
  const r = await other.request.patch(`${BASE}/api/profile`, { data: { walletAddress: "https://ilp.interledger-test.dev/daniel-e2e" } });
  if (!r.ok()) throw new Error(`profile update ${r.status()}`);
  handle = (await (await other.request.get(`${BASE}/api/state`)).json()).state.handle;
  if (!handle) throw new Error("no username assigned");
});

await step("first person signs up", async () => {
  await signUpAndOnboard(page, BASE, { fullName: "Ana López", preferred: "Ana" });
  const r = await page.request.patch(`${BASE}/api/profile`, { data: { walletAddress: "https://ilp.interledger-test.dev/ana-e2e" } });
  if (!r.ok()) throw new Error(`profile update ${r.status()}`);
});

await step("find the other person by exact @username", async () => {
  await page.goto(`${BASE}/move`);
  await page.getByRole("searchbox", { name: "Who are you paying?" }).fill(`@${handle}`);
  await main().getByRole("button", { name: /Daniel Kim.*On Sprout/ }).click();
});

await step("enter $50 and review", async () => {
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.getByRole("button", { name: "0", exact: true }).click();
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByText("How this payment moved").waitFor();
});

await step("send and see the receipt", async () => {
  await page.getByRole("button", { name: /^Send / }).click();
  await page.getByRole("heading", { name: "Sent" }).waitFor({ timeout: 15000 });
  await page.getByText("Create the outgoing payment").waitFor();
});

await step("partial @username doesn't reveal members", async () => {
  await page.goto(`${BASE}/move`);
  await page.getByRole("searchbox", { name: "Who are you paying?" }).fill(`@${handle.slice(0, 3)}`);
  await main().getByText(/No one on Sprout is @/).waitFor();
  if (await main().getByRole("button", { name: /Daniel Kim.*On Sprout/ }).count()) throw new Error("partial match listed a member");
});

await step("unknown wallet address shows a clear error", async () => {
  await page.getByRole("searchbox", { name: "Who are you paying?" }).fill("");
  await main().getByRole("button", { name: "Advanced options" }).click();
  await main().getByLabel("Wallet address").fill("https://ilp.interledger-test.dev/notfound-person");
  await main().getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText(/couldn't find a wallet/).waitFor();
});

await step("private and IP addresses are refused", async () => {
  for (const address of ["https://127.0.0.1/x", "https://wallet.internal/x", "http://ilp.example/x"]) {
    const r = await page.request.get(`${BASE}/api/wallet/resolve?address=${encodeURIComponent(address)}`);
    if (r.status() !== 400) throw new Error(`${address} gave ${r.status()}`);
  }
});

await step("simulated network failure then safe retry", async () => {
  await page.request.patch(`${BASE}/api/demo/flags`, { data: { failNextSend: true } });
  await page.goto(`${BASE}/move`);
  await page.getByRole("searchbox", { name: "Who are you paying?" }).fill(`@${handle}`);
  await main().getByRole("button", { name: /Daniel Kim.*On Sprout/ }).click();
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "0", exact: true }).click();
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: /^Send / }).click();
  await page.getByText(/couldn't reach the payment network/).waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Try again safely" }).click();
  await page.getByRole("heading", { name: "Sent" }).waitFor({ timeout: 15000 });
});

await step("receive tab shows my username", async () => {
  await page.goto(`${BASE}/move?tab=receive`);
  await main().getByText("@ana").first().waitFor();
});

await step("other tabs load", async () => {
  for (const p of ["/budget", "/grow", "/learn", "/profile", "/add-money"]) {
    const r = await page.goto(`${BASE}${p}`);
    if (!r || r.status() !== 200) throw new Error(`${p} → ${r?.status()}`);
  }
});

await browser.close();
if (problems.length) {
  console.log("\nProblems:\n  " + [...new Set(problems)].join("\n  "));
  process.exitCode = 1;
}
