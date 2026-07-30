import { expect, test } from "@playwright/test";
import { signInWithClerk } from "./helpers/auth";
import {
  CLERK_E2E_SKIP_REASON,
  hasClerkE2ECredentials,
} from "./helpers/env";

/**
 * E2E-02: Connect incompatible handle types → edge rejected.
 * Skips without Clerk test credentials.
 */
test.describe("E2E-02 invalid connection rejected", () => {
  test.beforeEach(() => {
    test.skip(!hasClerkE2ECredentials(), CLERK_E2E_SKIP_REASON);
  });

  test("incompatible types do not create an edge", async ({ page }) => {
    await signInWithClerk(page);

    await page.getByTestId("new-workflow-btn").click();
    await page.getByTestId("workflow-editor").waitFor({ timeout: 30_000 });
    await page.getByTestId("workflow-tab-workflow").click();

    // image[] output → video[] input is INVALID_CONNECTION
    await page.getByTestId("palette-open").click();
    await page.getByTestId("palette-search").fill("GPT Image");
    await page.getByTestId("palette-item-gpt_image_2").click();
    await page.getByTestId("palette-open").click();
    await page.getByTestId("palette-search").fill("Merge");
    await page.getByTestId("palette-item-merge_videos").click();

    const nodes = page.locator('[data-testid^="flow-node-"]');
    await expect(nodes).toHaveCount(2, { timeout: 10_000 });

    const source = nodes.nth(0).locator('[data-testid="handle-out:result"]');
    const target = nodes.nth(1).locator('[data-testid="handle-in:videos"]');
    await source.waitFor({ state: "visible" });
    await target.waitFor({ state: "visible" });

    const edgesBefore = await page.locator(".react-flow__edge").count();

    await source.dragTo(target);

    // Give React Flow a beat; rejection must leave edge count unchanged.
    await page.waitForTimeout(500);

    const edgesAfter = await page.locator(".react-flow__edge").count();
    expect(edgesAfter).toBe(edgesBefore);

    // Toast may appear if onConnect runs; otherwise RF isValidConnection blocks silently.
    const toast = page.getByTestId("connection-error-toast");
    if (await toast.isVisible().catch(() => false)) {
      await expect(toast).toHaveAttribute("data-code", "INVALID_CONNECTION");
    }
  });
});
