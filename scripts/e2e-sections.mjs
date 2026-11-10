// End-to-end check of Learn, Grow, and Budget in headless Chrome (no screenshots).
// Usage: node scripts/e2e-sections.mjs  (dev server on BASE, default :3100)
import { chromium } from "playwright";
import { signUpAndOnboard } from "./e2e-helpers.mjs";

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

await step("sign up a new person", async () => {
  await signUpAndOnboard(page, BASE, { fullName: "Kofi Mensah", preferred: "Kofi" });
});

// ── Learn ──
await step("Learn: Continue learning on top, units expand on tap", async () => {
  await page.getByRole("navigation").getByRole("link", { name: "Learn" }).locator("visible=true").first().click();
  await page.waitForURL("**/learn");
  await page.getByText("Continue learning").first().waitFor();
  await page.getByRole("link", { name: "Start lesson" }).waitFor();
  const unit = page.getByRole("button", { name: /How money moves/ });
  if ((await unit.getAttribute("aria-expanded")) !== "false") throw new Error("units should start collapsed");
  await unit.click();
  await page.getByRole("link", { name: /Interledger/ }).first().waitFor();
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
await step("Practice Investing: fake-money explainer, total value, challenges, graduate card", async () => {
  await page.goto(`${BASE}/grow`);
  await page.getByText("Practice money = fake money for learning").waitFor();
  await page.getByText("Practice portfolio value").waitFor();
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
await step("Budget overview: summary and tabs; new account asks for limits", async () => {
  await page.goto(`${BASE}/budget`);
  await page.getByText("left to spend across all categories").waitFor();
  await page.getByText(/Set a monthly limit for each category/).waitFor();
  for (const name of ["Overview", "Categories", "Bills", "Transactions"]) await page.getByRole("tab", { name }).waitFor();
});

await step("switch to semester and back", async () => {
  await page.getByRole("radio", { name: "Semester" }).click();
  await page.getByText(/Fall|Spring|Summer|Semester/).first().waitFor();
  await page.getByRole("radio", { name: "Monthly" }).click();
});

await step("set the Dining out limit to $150", async () => {
  await page.getByRole("tab", { name: "Categories" }).click();
  await page.getByRole("button", { name: /^Dining out\./ }).click();
  for (let i = 0; i < 8; i++) await page.getByRole("button", { name: "Delete" }).click();
  for (const k of ["1", "5", "0"]) await page.getByRole("button", { name: k, exact: true }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByText("Dining out limit updated").waitFor();
  await page.getByText("/ $150").first().waitFor();
});

await step("add a bill", async () => {
  await page.getByRole("tab", { name: "Bills" }).click();
  await page.getByText(/No upcoming bills/).waitFor();
  await page.getByRole("button", { name: "Add a bill" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("What's the bill?").fill("Rent");
  await dialog.getByLabel("Amount (USD)").fill("850");
  const due = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  await dialog.getByLabel("Due date").fill(due);
  await dialog.getByRole("button", { name: "Rent", exact: true }).click();
  await dialog.getByRole("button", { name: "Add a bill" }).click();
  await page.getByText("Rent added").waitFor();
  await page.locator("main").getByText("$850").first().waitFor();
});

await step("set aside the full amount, then remove the bill", async () => {
  await page.getByRole("button", { name: "Set aside for Rent" }).click();
  await page.getByRole("button", { name: "Set aside full amount" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByText(/^Saved for /).waitFor();
  await page.getByRole("button", { name: "Set aside for Rent" }).click();
  await page.getByRole("button", { name: "Remove this bill" }).click();
  await page.getByText("Rent removed").waitFor();
  await page.getByText(/No upcoming bills/).waitFor();
});

await step("transactions tab is empty for a new account", async () => {
  await page.getByRole("tab", { name: "Transactions" }).click();
  if (await page.getByText("Himalayan Grocery").count()) throw new Error("sample transactions shown");
});

console.log(problems.length ? `\nProblems:\n  ${[...new Set(problems)].join("\n  ")}` : "\nNo browser errors.");
await browser.close();
