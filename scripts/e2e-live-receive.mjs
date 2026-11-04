// Live receiving check (PAYMENTS_MODE=interledger, real test wallet): creates a
// request in the app, pays it over Interledger with scripts/pay-incoming.ts,
// and waits for the app to show it as paid. Moves real test-network money.
// Usage: node scripts/e2e-live-receive.mjs
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const step = async (name, fn) => {
  process.stdout.write(`- ${name} … `);
  try {
    await fn();
    console.log("ok");
  } catch (e) {
    console.log("FAILED\n   ", e.message.split("\n")[0]);
    process.exitCode = 1;
    await browser.close();
    process.exit();
  }
};

let opUrl = "";
await step("log in as Sudeep (live mode)", async () => {
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: /Sudeep Joshi/ }).click();
  await page.waitForURL("**/home");
  await page.goto(`${BASE}/move?tab=receive`);
  await page.getByText("Live: watching this wallet").waitFor();
});

await step("request $2 creates a real incoming payment", async () => {
  await page.goto(`${BASE}/move?tab=request`);
  await page.getByRole("button", { name: "2", exact: true }).click();
  await page.getByRole("button", { name: /Create request|Request/ }).last().click();
  await page.getByText("Real Open Payments request").waitFor();
  await page.getByText("Waiting for payment…").first().waitFor();
  opUrl = (await page.locator("p.font-mono", { hasText: "/incoming-payments/" }).innerText()).trim();
  if (!opUrl.includes("/incoming-payments/")) throw new Error(`no incoming payment url: ${opUrl}`);
});

await step("pay it over Interledger", async () => {
  const out = execFileSync("npx", ["tsx", "scripts/pay-incoming.ts", opUrl], { encoding: "utf8" });
  if (!out.includes("Outgoing payment created")) throw new Error(out);
});

await step("app shows Paid and a 'You received' notification", async () => {
  await page.getByText("You received $2.00").waitFor({ timeout: 30_000 });
  await page.getByText("Paid", { exact: true }).first().waitFor();
});

await browser.close();
