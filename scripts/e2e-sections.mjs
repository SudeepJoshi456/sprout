// End-to-end check of Learn, Grow, and Budget in headless Chrome (no screenshots).
// Usage: node scripts/e2e-sections.mjs  (dev server on BASE, default :3100)
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
    const screen = await page.locator("body").innerText().catch(() => "");
    console.log("    screen:", screen.replace(/\s+/g, " ").slice(0, 700));
    process.exitCode = 1;
  }
};

await step("log in as Sudeep", async () => {
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: /Sudeep Joshi/ }).click();
  await page.waitForURL("**/home");
  await page.getByText("Money from home arrived").locator("visible=true").first().waitFor();
});

// ── Learn ──
await step("Learn shows the course with units and the Interledger lesson", async () => {
  await page.getByRole("navigation").getByRole("link", { name: "Learn" }).locator("visible=true").first().click();
  await page.waitForURL("**/learn");
  await page.getByText("Starting from Zero").first().waitFor();
  await page.getByText("How money moves: Interledger and Open Payments").first().waitFor();
});

await step("glossary search finds Interledger", async () => {
  await page.getByRole("tab", { name: "Glossary" }).click();
  await page.getByRole("searchbox").fill("interledger");
  await page.locator("main").getByRole("button", { name: /Interledger/ }).first().waitFor();
  await page.getByRole("tab", { name: "Course" }).click();
});

await step("play the Interledger lesson: cards → quiz → result with sources", async () => {
  await page.goto(`${BASE}/learn/how-interledger-works`);
  await page.getByText("Money has no common language").first().waitFor();
  for (let i = 0; i < 12; i++) {
    if (await page.getByText("Quick check").first().isVisible().catch(() => false)) break;
    await page.getByRole("button", { name: "Next card" }).click();
  }
  for (let q = 0; q < 6; q++) {
    if (await page.getByText("Lesson complete").isVisible().catch(() => false)) break;
    await page.getByRole("radio").nth(1).check({ force: true });
    await page.getByRole("button", { name: "Check answer" }).click();
    const next = page.getByRole("button", { name: /Next question|See results/ });
    await next.click();
  }
  await page.getByText("Lesson complete").waitFor();
  await page.getByText("Sources").first().waitFor();
  await page.getByRole("link", { name: /interledger/i }).first().waitFor();
});

// ── Grow ──
await step("Grow portfolio tab: practice banner, total value, challenges, graduate card", async () => {
  await page.goto(`${BASE}/grow`);
  await page.getByText("Practice mode · Simulated · Not investment advice").waitFor();
  await page.getByText("Total value").waitFor();
  await page.getByText("Challenges").waitFor();
  await page.getByText("Graduate to real investing").waitFor();
});

await step("Explore lists and search", async () => {
  await page.getByRole("tab", { name: "Explore" }).click();
  await page.getByText("Index funds 101").waitFor();
  await page.getByRole("searchbox").fill("apple");
  await page.getByRole("link", { name: /Apple/ }).first().waitFor();
});

await step("asset page shows price, chart, about and stats", async () => {
  await page.goto(`${BASE}/grow/VOO`);
  await page.getByText(/Delayed price/).first().waitFor();
  await page.getByText("What is this fund?").waitFor();
  await page.getByText("Key stats").waitFor();
});

await step("walkthrough runs all 6 steps and finishes", async () => {
  await page.goto(`${BASE}/grow/AAPL?tour=stock-page`);
  await page.getByText("1 of 6").waitFor();
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("6 of 6").waitFor();
  await page.getByRole("button", { name: "Finish" }).click();
  await page.getByText(/You can read any stock page now/).waitFor();
});

await step("deep link ?trade=buy&amount=50 → review → filled", async () => {
  await page.goto(`${BASE}/grow/VOO?trade=buy&amount=50`);
  await page.getByRole("dialog", { name: "Buy VOO" }).waitFor();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByText("Estimated shares").waitFor();
  await page.getByRole("button", { name: /Confirm practice buy/ }).click();
  await page.getByText(/You bought .* shares of VOO/).waitFor();
  await page.getByRole("button", { name: "Done" }).click();
});

await step("holding shows on the asset page and in the portfolio", async () => {
  await page.getByText("Your position").waitFor();
  await page.goto(`${BASE}/grow`);
  await page.getByRole("link", { name: /Vanguard S&P 500/ }).first().waitFor();
});

// ── Budget ──
await step("Budget shows summary, categories and bills", async () => {
  await page.goto(`${BASE}/budget`);
  await page.getByText("Categories").first().waitFor();
  await page.getByText("Bills").first().waitFor();
  await page.getByText("Transactions").first().waitFor();
});

await step("switch to semester and back", async () => {
  await page.getByRole("radio", { name: "Semester" }).click();
  await page.getByText(/Fall|Spring|Semester/).first().waitFor();
  await page.getByRole("radio", { name: "Monthly" }).click();
});

await step("show amounts in NPR", async () => {
  await page.getByRole("switch", { name: /NPR/ }).click();
  await page.getByText(/NPR|रू|Rs/).first().waitFor();
  await page.getByRole("switch", { name: /NPR/ }).click();
});

await step("edit the Dining out limit to $150", async () => {
  await page.getByRole("button", { name: /^Dining out\./ }).click();
  for (let i = 0; i < 8; i++) await page.getByRole("button", { name: "Delete" }).click();
  for (const k of ["1", "5", "0"]) await page.getByRole("button", { name: k, exact: true }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByText("Dining out limit updated").waitFor();
  await page.getByText("/ $150").first().waitFor();
});

await step("set aside the full amount for the first bill", async () => {
  await page.getByRole("button", { name: /^Set aside for / }).first().click();
  await page.getByRole("button", { name: "Set aside full amount" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByText(/^Saved for /).waitFor();
});

await step("search and recategorize a transaction", async () => {
  await page.getByRole("searchbox").fill("grocery");
  const row = page.getByRole("button", { name: /Himalayan Grocery/ }).first();
  await row.click();
  await page.getByRole("radio", { name: "Dining out" }).click();
  await page.getByText("Moved to Dining out").waitFor();
});

console.log(problems.length ? `\nProblems:\n  ${[...new Set(problems)].join("\n  ")}` : "\nNo browser errors.");
await browser.close();
