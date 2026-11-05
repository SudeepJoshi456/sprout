// New-account funding in headless Chrome: signup starts at $0 with no account
// number → connect a demo bank → first deposit opens the account → Home and
// Send reflect it. Moves no real money. Usage: node scripts/e2e-funding.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS;
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("response", (r) => r.status() >= 400 && r.status() !== 409 && problems.push(`http ${r.status()} ${r.url()}`));

const main = () => page.locator("main").first();
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const step = async (name, fn) => {
  process.stdout.write(`- ${name} … `);
  try {
    await fn();
    console.log("ok");
  } catch (e) {
    console.log("FAILED\n   ", e.message.split("\n")[0]);
    console.log("    screen:", (await main().innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 400));
    process.exitCode = 1;
  }
};

await step("sign up", async () => {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/onboarding`);
  await page.getByText("I'm new to the US").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Autofill my details" }).click();
  for (let i = 0; i < 12 && !page.url().includes("/home"); i++) {
    if (await page.getByText("Send money home affordably").count()) await page.getByText("Send money home affordably").click().catch(() => {});
    await page.getByRole("button", { name: /^(Continue|Verify|Connect wallet|Finish setup|Go to my home)$/ }).locator("visible=true").first().click({ timeout: 15_000 });
    await page.waitForTimeout(400);
  }
  await page.waitForURL(/\/home/);
});

await step("new account: no balance card or account number, setup steps instead", async () => {
  await main().getByText("Let's fund your account").waitFor();
  if (await main().getByText(/Everyday checking ••/).count()) throw new Error("account number shown before first deposit");
  await shot("1-home-unfunded");
});

await step("Send asks to add money first", async () => {
  await page.goto(`${BASE}/move`);
  await main().getByText("Add money before you send").waitFor();
});

await step("connect Chase: pick bank → demo sign-in → choose checking", async () => {
  await page.goto(`${BASE}/add-money`);
  await main().getByRole("button", { name: /Chase/ }).click();
  await main().getByText("Demo bank.", { exact: false }).waitFor();
  await shot("2-signin");
  await main().getByRole("button", { name: "Sign in" }).click();
  await main().getByText("Total Checking ••4417").click();
  await shot("3-choose-account");
  await main().getByRole("button", { name: "Connect account" }).click();
  await main().getByText("Amount to add").first().waitFor();
});

await step("deposit $500 opens the account", async () => {
  await main().getByRole("button", { name: "$500" }).click();
  await shot("4-amount");
  await main().getByRole("button", { name: "Add $500.00" }).click();
  await main().getByText("Your account is open").waitFor();
  await shot("5-done");
});

await step("Home shows $500 and the new account number", async () => {
  await page.goto(`${BASE}/home`);
  await main().getByText(/Everyday checking ••\d{4}/).waitFor();
  await main().getByText("$500.00").first().waitFor();
  await shot("6-home-funded");
});

await step("Send now lists recipients", async () => {
  await page.goto(`${BASE}/move`);
  await main().getByRole("listitem").getByRole("button", { name: /Sita Joshi/ }).waitFor();
});

await step("Profile shows the linked bank", async () => {
  await page.goto(`${BASE}/profile`);
  await main().getByText("Total Checking ••4417").waitFor();
});

await step("Sudeep sample login still has his full history", async () => {
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/login`);
  await main().getByRole("button", { name: /Sudeep Joshi/ }).click();
  await page.waitForURL(/\/home/);
  await main().getByText("Everyday checking ••2048").waitFor();
});

await browser.close();
if (problems.length) {
  console.log("\nProblems:\n  " + [...new Set(problems)].join("\n  "));
  process.exitCode = 1;
}
