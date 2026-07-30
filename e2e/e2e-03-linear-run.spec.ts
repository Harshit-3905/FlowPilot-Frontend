import { expect, test } from "@playwright/test";
import { signInWithClerk } from "./helpers/auth";
import {
  CLERK_E2E_SKIP_REASON,
  hasClerkE2ECredentials,
} from "./helpers/env";
import {
  addGptImageNodes,
  connectImageToImage,
  openNewWorkflowEditor,
  playWorkflow,
  waitForSaved,
  waitHistoryRunStatus,
} from "./helpers/workflow";

/**
 * E2E-03: Run linear stub workflow → history completed; canvas statuses.
 * Skips without Clerk E2E credentials. Needs FE + API + stubs (prefer
 * STUB_PROVIDER_DELAY_MS=0 on backend for faster runs).
 */
const describeE2E = hasClerkE2ECredentials()
  ? test.describe
  : test.describe.skip;

describeE2E("E2E-03 linear stub run", () => {
  test("linear A→B completes; history + canvas show completed", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    test.info().annotations.push({
      type: "skip-reason-if-no-clerk",
      description: CLERK_E2E_SKIP_REASON,
    });

    await signInWithClerk(page);
    await openNewWorkflowEditor(page);

    const nodes = await addGptImageNodes(page, 2);
    const nodeA = nodes.nth(0);
    const nodeB = nodes.nth(1);

    // Ensure prompts are non-empty for a meaningful stub run.
    await nodeA.locator('[data-testid$="-field-prompt"]').fill("e2e linear A");
    await nodeB.getByTestId("submodel-gpt-image-2-edit").click();
    await nodeB.locator('[data-testid$="-field-prompt"]').fill("e2e linear B");

    await connectImageToImage(page, nodeA, nodeB);
    await expect(page.locator(".react-flow__edge")).toHaveCount(1, {
      timeout: 5_000,
    });

    await waitForSaved(page);
    await playWorkflow(page);

    await waitHistoryRunStatus(page, "completed", 150_000);

    await expect(
      page.locator('[data-testid^="flow-node-"][data-status="completed"]'),
    ).toHaveCount(2, { timeout: 30_000 });
  });
});
