import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

/**
 * Obtains a Clerk Testing Token when CLERK_SECRET_KEY (+ publishable) are present.
 * Without keys, setup is a no-op so always-on config tests still run in CI.
 */
setup.describe.configure({ mode: "serial" });

setup("clerk testing token (optional)", async () => {
  const secret =
    process.env.CLERK_SECRET_KEY ?? process.env.E2E_CLERK_SECRET_KEY;
  const publishable =
    process.env.CLERK_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    process.env.E2E_CLERK_PUBLISHABLE_KEY;

  if (!secret || !publishable) {
    // Authenticated specs skip via hasClerkE2ECredentials(); config/CORS still run.
    return;
  }

  process.env.CLERK_SECRET_KEY = secret;
  process.env.CLERK_PUBLISHABLE_KEY = publishable;
  await clerkSetup();
});
