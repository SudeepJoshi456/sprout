// Checks the customer-facing UX rules: plain names, a short Home, friendly
// send/receive, hidden demo tools, and no sideways scrolling on a small phone.
// Usage: node scripts/e2e-ux.mjs  (server on BASE, default :3100)
import { chromium } from "playwright";
import { signUpAndOnboard } from "./e2e-helpers.mjs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "chrome" });
const page = await browser.newPage({ viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

const step = async (name, fn) => {
  process.stdout.write(`- ${name} … `);
  try {
    await fn();
    console.log("ok");
  } catch (e) {
    console.log("FAILED\n   ", e.message.split("\n")[0]);
    const screen = await page.locator("body").innerText().catch(() => "");
    console.log("    screen:", screen.replace(/\s+/g, " ").slice(0, 600));
    process.exitCode = 1;
  }
};
const main = () => page.locator("main");

await step("sign up a new person", async () => {
  await signUpAndOnboard(page, BASE, { fullName: "Priya Raman", preferred: "Priya" });
});

await step("tabs say what they do", async () => {
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const name of ["Home", "Budget", "Send & Receive", "Practice Investing", "Learn"]) await nav.getByRole("link", { name }).waitFor();
});

await step("Home is a short overview", async () => {
  await page.goto(`${BASE}/home`);
  for (const name of [/Budget/, /Upcoming bills/, /Practice Investing/, /Continue learning/]) await main().getByRole("link", { name }).first().waitFor();
  if (await main().getByText("Coach", { exact: true }).count()) throw new Error("coach card should not be on Home");
});

await step("Send: unknown @username is explained, address is under Advanced", async () => {
  await page.goto(`${BASE}/move`);
  await page.getByRole("searchbox", { name: "Who are you paying?" }).fill("@nobody");
  await main().getByText(/No one on Sprout is @nobody/).waitFor();
  if (await main().getByLabel("Wallet address").count()) throw new Error("wallet address field should be hidden");
  await main().getByRole("button", { name: "Advanced options" }).click();
  await main().getByLabel("Wallet address").waitFor();
});

await step("Receive asks for a wallet first", async () => {
  await page.goto(`${BASE}/move?tab=receive`);
  await main().getByText("Connect a wallet to receive money.").waitFor();
});

await step("Receive shows the Sprout username first once a wallet is added", async () => {
  const r = await page.request.patch(`${BASE}/api/profile`, { data: { walletAddress: "https://ilp.interledger-test.dev/priya-e2e" } });
  if (!r.ok()) throw new Error(`profile update ${r.status()}`);
  await page.goto(`${BASE}/move?tab=receive`);
  await main().getByText("@priya").first().waitFor();
  await main().getByRole("button", { name: "Share my username" }).waitFor();
  if (await main().getByText(/^https:\/\//).count()) throw new Error("wallet address should be under Advanced options");
});

await step("Profile hides testing tools until the version is tapped 5 times", async () => {
  await page.evaluate(() => localStorage.removeItem("sprout.demoTools"));
  await page.goto(`${BASE}/profile`);
  for (const hidden of ["Reset app data", "Switch account", "Simulate a network failure on the next send"]) {
    if (await main().getByText(hidden).count()) throw new Error(`"${hidden}" should be hidden`);
  }
  for (let i = 0; i < 5; i++) await main().getByRole("button", { name: /Sprout prototype/ }).click();
  await main().getByText("Simulate a network failure on the next send").waitFor();
  if (await main().getByText(/Reset app data|Switch account/).count()) throw new Error("persona/reset tools should be gone");
  await main().getByRole("button", { name: "Hide" }).click();
});

await step("no page scrolls sideways at 360px", async () => {
  const wide = [];
  for (const p of ["/", "/home", "/budget", "/budget?tab=bills", "/move", "/move?tab=receive", "/move?tab=request", "/grow", "/grow?tab=explore", "/grow/AAPL", "/learn", "/profile", "/add-money"]) {
    await page.goto(BASE + p);
    await page.waitForTimeout(700);
    const over = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const els = [document.documentElement, ...document.querySelectorAll("main, main *")];
      return els.filter((e) => e.textContent.trim() && e.scrollWidth > e.clientWidth + 1 && !["hidden", "clip"].includes(getComputedStyle(e).overflowX)).length + (document.documentElement.scrollWidth > vw ? 1 : 0);
    });
    if (over) wide.push(p);
  }
  if (wide.length) throw new Error(`sideways overflow on ${wide.join(", ")}`);
});

await step("form fields are 16px+ so iOS doesn't zoom in", async () => {
  await page.goto(`${BASE}/move`);
  const size = await page.getByRole("searchbox").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  if (size < 16) throw new Error(`input font-size ${size}px`);
});

console.log(problems.length ? `\nProblems:\n  ${[...new Set(problems)].join("\n  ")}` : "\nNo browser errors.");
await browser.close();
