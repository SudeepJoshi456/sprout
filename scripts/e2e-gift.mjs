// Gift a stock between two brand-new accounts in headless Chrome, with
// simulated payments (server without Interledger keys). Moves no real money.
// Usage: node scripts/e2e-gift.mjs  (server on BASE, default :3100)
import { chromium } from "playwright";
import { signUpAndOnboard } from "./e2e-helpers.mjs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "chrome" });
const problems = [];
const watch = (p) => {
  p.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  p.on("response", (r) => r.status() >= 400 && ![404, 409, 422].includes(r.status()) && problems.push(`http ${r.status()} ${r.url()}`));
};
const friend = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
watch(friend);
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
await step("two people sign up", async () => {
  await signUpAndOnboard(friend, BASE, { fullName: "Daniel Kim", preferred: "Daniel" });
  handle = (await (await friend.request.get(`${BASE}/api/state`)).json()).state.handle;
  if (!handle) throw new Error("no username assigned");
  await signUpAndOnboard(page, BASE, { fullName: "Maya Torres", preferred: "Maya" });
});

await step("unknown username is explained", async () => {
  await page.goto(`${BASE}/grow/SPOT`);
  await page.getByRole("button", { name: "Gift" }).click();
  await page.getByLabel("Friend's Sprout username").fill("@nobody-here-zz");
  await page.getByRole("button", { name: /^Review .* gift$/ }).click();
  await page.getByText(/couldn't find @nobody-here-zz/).waitFor();
});

await step("gift $10 of Spotify with a note", async () => {
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Friend's Sprout username").fill(`@${handle}`);
  await sheet.getByRole("button", { name: "$10", exact: true }).click();
  await sheet.getByLabel("Note (optional)").fill("Happy birthday!");
  await sheet.getByRole("button", { name: "Review $10 gift" }).click();
  await sheet.getByText("Daniel Kim").first().waitFor();
  await sheet.getByRole("button", { name: /^Pay .* and send gift$/ }).click();
  await sheet.getByRole("heading", { name: "Gift sent" }).waitFor();
});

await step("friend sees the gift on Home and owns the shares", async () => {
  await friend.goto(`${BASE}/home`);
  await friend.getByText(/Maya Torres sent you \$10\.00 of Spotify/).waitFor();
  await friend.getByText("“Happy birthday!”").waitFor();
  await friend.goto(`${BASE}/grow`);
  await friend.getByText("Shares you own").waitFor();
  await friend.locator("main").getByRole("link", { name: /Spotify.*shares/ }).waitFor();
});

await step("dismissing the gift hides it", async () => {
  await friend.goto(`${BASE}/home`);
  await friend.getByRole("button", { name: "Got it" }).click();
  await friend.waitForTimeout(800);
  await friend.reload();
  await friend.getByText("Your brands").first().waitFor();
  if (await friend.getByText(/sent you \$10\.00 of Spotify/).count()) throw new Error("gift still shown after dismiss");
});

await browser.close();
if (problems.length) {
  console.log("\nProblems:\n  " + [...new Set(problems)].join("\n  "));
  process.exitCode = 1;
}
