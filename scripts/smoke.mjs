// Loads key pages in headless Chromium and prints console/page errors.
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3100";
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/login", "/onboarding", "/home"];

const browser = await chromium.launch({ channel: process.env.CHANNEL ?? "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") console.log(`  [console.${m.type()}]`, m.text().slice(0, 400));
});
page.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0, 400)));
page.on("response", (r) => {
  if (r.status() >= 400) console.log(`  [http ${r.status()}]`, r.url());
});
for (const p of paths) {
  console.log(`== ${p}`);
  await page.goto(BASE + p, { waitUntil: "networkidle" }).catch((e) => console.log("  goto failed", e.message));
  await page.waitForTimeout(1500);
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300);
  console.log("  url:", page.url());
  console.log("  text:", text);
}
await browser.close();
