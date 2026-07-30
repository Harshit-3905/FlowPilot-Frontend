import { setupClerkTestingToken } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";
import { clerkE2EUser } from "./env";

/** Inject Clerk testing token then sign in with email/password test user. */
export async function signInWithClerk(page: Page): Promise<void> {
  await setupClerkTestingToken({ page });

  const { email, password } = clerkE2EUser();
  await page.goto("/sign-in");

  // Clerk <SignIn /> — identifiers vary by Dashboard config (email vs username).
  const identifier = page.locator('input[name="identifier"]').first();
  await identifier.waitFor({ state: "visible", timeout: 30_000 });
  await identifier.fill(email);

  const continueBtn = page.getByRole("button", { name: /continue/i });
  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
  }

  const passwordInput = page.locator('input[name="password"]').first();
  await passwordInput.waitFor({ state: "visible", timeout: 15_000 });
  await passwordInput.fill(password);

  await page.getByRole("button", { name: /sign in|continue/i }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 45_000,
  });
  await page.getByTestId("workflows-home").waitFor({ timeout: 30_000 });
}
