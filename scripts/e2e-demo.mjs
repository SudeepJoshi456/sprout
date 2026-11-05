// Full demo rehearsal in headless Chrome: signup → Home → live send → live
// request → Budget → Grow → Learn → Profile. In interledger mode this moves
// about $2 of real test-network money. Usage: node scripts/e2e-demo.mjs
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && !m.text().includes("409") && problems.push(`console: ${m.text()}`));
page.on("response", (r) => r.status() >= 400 && r.status() !== 409 && problems.push(`http ${r.status()} ${r.url()}`));

const step = async (name, fn) => {
  process.stdout.write(`- ${name} … `);
  const t0 = Date.now();
  try {
    await fn();
    console.log(`ok (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (e) {
    console.log("FAILED\n   ", e.message.split("\n")[0]);
    const screen = await page.locator("main").first().innerText().catch(() => "");
    console.log("    screen:", screen.replace(/\s+/g, " ").slice(0, 500));
    process.exitCode = 1;
  }
};
const main = () => page.locator("main").first();
const live = await fetch(`${BASE}/api/health`).then((r) => r.json()).then((h) => h.modes.payments === "interledger");
console.log(`Payments mode: ${live ? "LIVE (Interledger test network)" : "simulated"}\n`);

await step("welcome page has no side panel or demo instructions", async () => {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.getByRole("link", { name: "Get started" }).or(page.getByRole("button", { name: "Get started" })).first().waitFor();
  for (const text of ["Demo script", "Our principles", "Built for Dollarcraft", "demo person"]) {
    if (await page.getByText(text).count()) throw new Error(`found "${text}"`);
  }
});

await step("signup with autofill, ends on Home", async () => {
  await page.getByRole("link", { name: "Get started" }).or(page.getByRole("button", { name: "Get started" })).first().click();
  await page.waitForURL("**/onboarding");
  await page.getByText("I'm new to the US").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Autofill my details" }).click();
  for (let i = 0; i < 12 && !page.url().includes("/home"); i++) {
    const btn = page.getByRole("button", { name: /^(Continue|Verify|Connect wallet|Finish setup|Go to my home)$/ }).locator("visible=true").first();
    if (await page.getByText("Send money home affordably").count()) await page.getByText("Send money home affordably").click().catch(() => {});
    await btn.click({ timeout: 15_000 });
    await page.waitForTimeout(400);
  }
  await page.waitForURL(/\/home/, { timeout: 15_000 });
  await main().getByText(/Sudeep/).first().waitFor();
});

await step("Profile shows the real wallet and identity", async () => {
  await page.goto(`${BASE}/profile`);
  await main().getByText("Sudeep Joshi").first().waitFor();
  await main().getByText(/Verified with/).waitFor();
  if (live) {
    await main().getByText("https://ilp.interledger-test.dev/sudeep-sprout-sender").waitFor();
    await main().getByText("Live · Interledger test network").waitFor();
  }
});

await step(`send $1 to Mom${live ? " (real)" : ""} → receipt with payment trace`, async () => {
  await page.goto(`${BASE}/move`);
  await main().getByRole("listitem").getByRole("button", { name: /Sita Joshi/ }).click();
  await main().getByRole("button", { name: "1", exact: true }).click();
  await main().getByRole("button", { name: "Review" }).click();
  await page.getByText("How this payment moved").first().waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /^Send \$/ }).click();
  await page.getByText(/Sent|on its way|arrived/i).first().waitFor({ timeout: 30_000 });
  await page.getByText("Create the outgoing payment").first().waitFor();
  if (live) await page.getByText("Each step is a real Open Payments call", { exact: false }).first().waitFor();
});

if (live) {
  await step("request $1 (real incoming payment) and receive it", async () => {
    await page.goto(`${BASE}/move?tab=request`);
    await main().getByRole("button", { name: "1", exact: true }).click();
    await main().getByRole("button", { name: "Create request link" }).click();
    await page.getByText("Real Open Payments request").waitFor();
    const url = (await page.locator("p.font-mono", { hasText: "/incoming-payments/" }).innerText()).trim();
    execFileSync("npx", ["tsx", "scripts/pay-incoming.ts", url], { encoding: "utf8" });
    await page.getByText("You received $1.00").waitFor({ timeout: 30_000 });
    await page.getByText("Paid", { exact: true }).first().waitFor();
  });
}

await step("Budget, Grow, Learn render", async () => {
  await page.goto(`${BASE}/budget`);
  await main().getByText("Categories").first().waitFor();
  await page.goto(`${BASE}/grow`);
  await main().getByText("Total value").waitFor();
  await page.goto(`${BASE}/grow/VOO`);
  await main().getByText("Key stats").waitFor();
  await page.goto(`${BASE}/learn`);
  await main().getByText("Starting from Zero").first().waitFor();
});

await step("switch to Marcus and back from Profile", async () => {
  await page.goto(`${BASE}/profile`);
  await main().getByRole("button", { name: "Marcus Johnson" }).click();
  await page.waitForURL(/\/home/);
  await main().getByText("••7731").first().waitFor();
  await page.goto(`${BASE}/profile`);
  await main().getByRole("button", { name: "Sudeep Joshi" }).click();
  await page.waitForURL(/\/home/);
});

console.log(problems.length ? `\nProblems:\n  ${[...new Set(problems)].join("\n  ")}` : "\nNo browser errors.");
await browser.close();
