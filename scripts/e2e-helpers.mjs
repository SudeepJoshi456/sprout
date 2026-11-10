// Shared steps for the browser checks: create a brand-new account (unique
// email) and walk through onboarding. Fake people only.
export const PASSWORD = "sprout-e2e-Passw0rd";

export function uniqueEmail(tag = "e2e") {
  return `${tag}+${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;
}

/** Signs up through /signup and finishes onboarding; ends on /home. */
export async function signUpAndOnboard(page, base, { email = uniqueEmail(), fullName = "Ana López", preferred = "Ana" } = {}) {
  await page.goto(`${base}/signup`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/onboarding");

  await page.getByText("I'm new to the US").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel(/What should we call you/).fill(preferred);
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("button", { name: "I understand, continue" }).click();
  await page.getByText("ITIN", { exact: true }).click();
  await page.getByLabel("ITIN", { exact: true }).fill("912345678");
  await page.getByRole("button", { name: "Verify" }).click();
  await page.getByRole("button", { name: "Continue" }).locator("visible=true").first().click({ timeout: 15_000 });

  await page.getByRole("heading", { name: /wallet/i }).first().waitFor();
  await page.getByRole("button", { name: /^(Continue|Skip for now|Skip)/ }).locator("visible=true").first().click();

  await page.getByText("Build an emergency fund").click();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await page.waitForURL("**/home**");
  return email;
}
