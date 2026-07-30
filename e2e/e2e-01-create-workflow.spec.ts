import { expect, test } from "@playwright/test";
import { signInWithClerk } from "./helpers/auth";
import {
  CLERK_E2E_SKIP_REASON,
  hasClerkE2ECredentials,
} from "./helpers/env";

/**
 * E2E-01: Sign in → create workflow → add node → save → reload shows graph.
 * Skips in CI / local without Clerk test credentials.
 */
test.describe("E2E-01 create workflow save reload", () => {
  test.beforeEach(() => {
    test.skip(!hasClerkE2ECredentials(), CLERK_E2E_SKIP_REASON);
  });

  test("sign in → create → save → reload shows graph", async ({ page }) => {
    await signInWithClerk(page);

    await page.getByTestId("new-workflow-btn").click();
    await page.getByTestId("workflow-editor").waitFor({ timeout: 30_000 });
    await page.getByTestId("workflow-canvas").waitFor();

    // Ensure Workflow tab (canvas + add-node overlay).
    await page.getByTestId("workflow-tab-workflow").click();
    await page.getByTestId("palette-open").click();
    await page.getByTestId("node-palette").waitFor();
    await page.getByTestId("palette-search").fill("GPT Image");
    await page.getByTestId("palette-item-gpt_image_2").click();
    await page.locator('[data-testid^="flow-node-"]').first().waitFor();

    await expect(page.getByTestId("save-indicator")).toHaveText(/Saved/i, {
      timeout: 15_000,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("workflow-editor").waitFor({ timeout: 30_000 });
    await page.getByTestId("workflow-tab-workflow").click();

    await expect(page.locator('[data-testid^="flow-node-"]').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
