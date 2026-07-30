import { expect, test } from "@playwright/test";
import { signInWithClerk } from "./helpers/auth";
import {
  CLERK_E2E_SKIP_REASON,
  hasClerkE2ECredentials,
} from "./helpers/env";
import {
  addGptImageNodes,
  openNewWorkflowEditor,
  playWorkflow,
  waitForSaved,
} from "./helpers/workflow";

/**
 * E2E-05: Insufficient credits → blocked; message shown.
 * Intercepts POST start-run with a 402 envelope so the banner path is
 * deterministic without draining a real credit account. Backend L3 covers
 * real 402 + no Run row (`deduct-run-estimate.test.ts`).
 */
const describeE2E = hasClerkE2ECredentials()
  ? test.describe
  : test.describe.skip;

describeE2E("E2E-05 insufficient credits", () => {
  test("Play blocked with insufficient credits banner", async ({ page }) => {
    test.info().annotations.push({
      type: "skip-reason-if-no-clerk",
      description: CLERK_E2E_SKIP_REASON,
    });

    await signInWithClerk(page);
    await openNewWorkflowEditor(page);
    await addGptImageNodes(page, 1);
    await waitForSaved(page);

    await page.route(/\/api\/v1\/workflows\/[^/]+\/runs$/, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({
          code: "insufficient_credits",
          message: "Insufficient credits: need 210000 microcredits, have 0",
          details: {
            balance: 0,
            required: 210_000,
            displayM: { balance: 0, required: 0.21 },
          },
        }),
      });
    });

    await playWorkflow(page);

    const banner = page.getByTestId("run-status");
    await expect(banner).toHaveAttribute("data-kind", "error", {
      timeout: 15_000,
    });
    await expect(banner).toHaveAttribute("data-code", "insufficient_credits");
    await expect(page.getByTestId("run-status-message")).toContainText(
      /Insufficient credits/i,
    );
    await expect(page.getByTestId("run-status-message")).toContainText("0.21");

    // No completed history row from this blocked start.
    await expect(page.getByTestId("history-empty")).toBeVisible();
  });
});
