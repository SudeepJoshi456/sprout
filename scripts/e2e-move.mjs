// End-to-end check of the Move flow in headless Chrome (no screenshots).
// Usage: node scripts/e2e-move.mjs  (dev server on BASE, default :3100)
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
page.on("response", (r) => r.status() >= 400 && r.status() !== 409 && problems.push(`http ${r.status()} ${r.url()}`));

const step = async (name, fn) => {
  process.stdout.write(`- ${name} … `);
  try {
    await fn();
    console.log("ok");
  } catch (e) {
    console.log("FAILED\n   ", e.message.split("\n")[0]);
    const screen = await page.locator("main").first().innerText().catch(() => "");
    console.log("    screen:", screen.replace(/\s+/g, " ").slice(0, 600));
    process.exitCode = 1;
  }
};

await step("log in as Sudeep", async () => {
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: /Sudeep Joshi/ }).click();
  await page.waitForURL("**/home");
  await page.getByText("Money from home arrived").locator("visible=true").first().waitFor();
});

await step("open Move from the tab bar", async () => {
  await page.getByRole("link", { name: "Move" }).click();
  await page.waitForURL("**/move");
  await page.getByText("Your people").waitFor();
});

await step("pick Mom (NPR) and enter $50", async () => {
  await page.getByRole("listitem").getByRole("button", { name: /Sita Joshi/ }).click();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.getByRole("button", { name: "0", exact: true }).click();
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByText("Review and send").or(page.getByText("You send")).first().waitFor();
});

await step("review shows fee, rate, NPR received and the step trace", async () => {
  await page.getByText("Exchange rate").waitFor();
  await page.getByText(/NPR/).first().waitFor();
  await page.getByText("How this payment moved").waitFor();
});

await step("send and see the receipt", async () => {
  await page.getByRole("button", { name: /^Send / }).click();
  await page.getByRole("heading", { name: "Sent" }).waitFor({ timeout: 15000 });
  await page.getByText("Create the outgoing payment").waitFor();
});

await step("receive tab shows wallet address and QR", async () => {
  await page.getByRole("tab", { name: "Receive" }).click();
  await page.getByRole("img", { name: /QR code/ }).waitFor();
});

await step("request link opens a prefilled send", async () => {
  await page.getByRole("tab", { name: "Request" }).click();
  await page.getByRole("button", { name: "$20" }).click();
  await page.getByRole("button", { name: "Create request link" }).click();
  const link = await page.locator("p.font-mono").first().innerText();
  // Paying yourself is blocked, so swap in another wallet to check the prefill.
  const url = new URL(link);
  url.searchParams.set("to", "https://ilp.interledger-test.dev/daniel-kim");
  url.searchParams.set("name", "Daniel Kim");
  await page.goto(url.toString());
  await page.getByText("To Daniel Kim").waitFor();
});

await step("unknown wallet shows a clear error", async () => {
  await page.goto(`${BASE}/move`);
  await page.getByLabel("Who are you paying?").fill("https://ilp.interledger-test.dev/notfound-person");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText(/couldn't find a wallet/).waitFor();
});

await step("simulated network failure then safe retry", async () => {
  const sid = await page.evaluate(() => localStorage.getItem("sprout.sid"));
  await page.request.patch(`${BASE}/api/demo/flags`, { headers: { "x-sprout-session": sid }, data: { failNextSend: true } });
  await page.getByLabel("Who are you paying?").fill("");
  await page.getByRole("listitem").getByRole("button", { name: /Ana López/ }).click();
  await page.getByRole("button", { name: "$10", exact: true }).first().click();
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("button", { name: /^Send / }).click();
  await page.getByText(/couldn't reach the payment network/).waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Try again safely" }).click();
  await page.getByRole("heading", { name: "Sent" }).waitFor({ timeout: 15000 });
});

await step("other tabs don't 404", async () => {
  for (const p of ["/budget", "/grow", "/learn", "/profile"]) {
    const r = await page.goto(`${BASE}${p}`);
    if (!r || r.status() !== 200) throw new Error(`${p} → ${r?.status()}`);
  }
});

console.log(problems.length ? `\nProblems:\n  ${[...new Set(problems)].join("\n  ")}` : "\nNo browser errors.");
await browser.close();
