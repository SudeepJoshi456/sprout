// Accounts and security in headless Chrome: sign up, empty start, log out,
// wrong password, log in again, signed-out API access, headers, delete.
// Usage: node scripts/e2e-auth.mjs  (server on BASE, default :3100)
import { chromium } from "playwright";
import { PASSWORD, signUpAndOnboard, uniqueEmail } from "./e2e-helpers.mjs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

const main = () => page.locator("main").first();
const step = async (name, fn) => {
  process.stdout.write(`- ${name} … `);
  try {
    await fn();
    console.log("ok");
  } catch (e) {
    console.log("FAILED\n   ", e.message.split("\n")[0]);
    console.log("    screen:", (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 500));
    process.exitCode = 1;
  }
};

const email = uniqueEmail("auth");

await step("signed-out visitors are sent to log in", async () => {
  await page.goto(`${BASE}/home`);
  await page.waitForURL(/\/login/);
  const r = await page.request.get(`${BASE}/api/state`);
  if (r.status() !== 401) throw new Error(`/api/state gave ${r.status()} without a session`);
  for (const p of ["/api/market/quotes", "/api/wallet/resolve?address=https://ilp.example/x", "/api/users/lookup?handle=ana"]) {
    const s = (await page.request.get(BASE + p)).status();
    if (s !== 401) throw new Error(`${p} gave ${s} without a session`);
  }
});

await step("signup rejects a weak password", async () => {
  await page.goto(`${BASE}/signup`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await main().getByRole("alert").first().waitFor();
  if (page.url().includes("/onboarding")) throw new Error("weak password was accepted");
});

await step("sign up and onboard a new person", async () => {
  await signUpAndOnboard(page, BASE, { email, fullName: "Maya Torres", preferred: "Maya" });
});

await step("new account starts empty: no sample people, bills or transactions", async () => {
  await page.goto(`${BASE}/budget?tab=bills`);
  await main().getByText(/No upcoming bills/).waitFor();
  await page.goto(`${BASE}/budget?tab=transactions`);
  for (const sample of ["Himalayan Grocery", "Sita Joshi", "Money from home"]) {
    if (await main().getByText(sample).count()) throw new Error(`sample data "${sample}" shown to a new account`);
  }
  await page.goto(`${BASE}/move`);
  if (await main().getByText(/Sita Joshi|Ana López|Daniel Kim/).count()) throw new Error("sample contacts shown");
});

await step("session cookie is httpOnly and SameSite", async () => {
  const cookie = (await page.context().cookies()).find((c) => /sprout_session/.test(c.name));
  if (!cookie) throw new Error("no session cookie");
  if (!cookie.httpOnly) throw new Error("session cookie readable by scripts");
  if (cookie.sameSite !== "Lax" && cookie.sameSite !== "Strict") throw new Error(`sameSite=${cookie.sameSite}`);
  if (await page.evaluate(() => document.cookie.includes("sprout_session"))) throw new Error("cookie visible to JS");
});

await step("security headers are set", async () => {
  const r = await page.request.get(`${BASE}/home`);
  const h = r.headers();
  for (const k of ["content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy"]) if (!h[k]) throw new Error(`missing ${k}`);
  if (!/frame-ancestors 'none'/.test(h["content-security-policy"])) throw new Error("CSP allows framing");
  if (h["x-powered-by"]) throw new Error("x-powered-by leaks the framework");
});

await step("cross-site writes are refused", async () => {
  const r = await page.request.patch(`${BASE}/api/profile`, { headers: { origin: "https://evil.example" }, data: { homeCurrency: "NPR" } });
  if (r.status() !== 403) throw new Error(`cross-origin PATCH gave ${r.status()}`);
});

await step("log out", async () => {
  await page.goto(`${BASE}/profile`);
  await main().getByText(email).waitFor();
  await main().getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  const r = await page.request.get(`${BASE}/api/state`);
  if (r.status() !== 401) throw new Error(`still signed in after logout (${r.status()})`);
});

await step("wrong password gets a generic error", async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("not-the-right-1");
  await page.getByRole("button", { name: "Log in" }).click();
  await main().getByText(/email and password don't match/i).waitFor();
});

await step("log back in and keep your data", async () => {
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/home");
  await page.getByText(/Maya/).first().waitFor();
});

await step("delete the account", async () => {
  await page.goto(`${BASE}/profile`);
  await main().getByRole("button", { name: "Delete my account" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await dialog.getByRole("button", { name: "Delete forever" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  const r = await page.request.post(`${BASE}/api/auth/login`, { data: { email, password: PASSWORD } });
  if (r.status() !== 401) throw new Error(`deleted account could still log in (${r.status()})`);
});

await browser.close();
if (problems.length) {
  console.log("\nProblems:\n  " + [...new Set(problems)].join("\n  "));
  process.exitCode = 1;
}
