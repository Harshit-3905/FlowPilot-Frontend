import { expect, test } from "@playwright/test";
import { signInWithClerk } from "./helpers/auth";
import {
  CLERK_E2E_SKIP_REASON,
  hasClerkE2ECredentials,
} from "./helpers/env";
import {
  gptImageNode,
  openNewWorkflowEditor,
  patchWorkflowGraph,
  playWorkflow,
  reloadEditor,
  selectLatestHistoryRun,
  waitHistoryRunStatus,
} from "./helpers/workflow";

/**
 * E2E-06: Failed node → partial outputs visible; attempts shown.
 * Seeds A (stub image, succeeds) + B (merge_videos with unreachable URLs →
 * adapter failure with RunNodeAttempt rows).
 */
const describeE2E = hasClerkE2ECredentials()
  ? test.describe
  : test.describe.skip;

const PARTIAL_FAIL_GRAPH = {
  nodes: [
    gptImageNode("A", { x: 0, y: 80 }, "ok stub image"),
    {
      id: "B",
      type: "merge_videos",
      position: { x: 420, y: 80 },
      data: {
        label: "Merge Videos",
        inputs: {
          // Valid Zod (≥2) but HTTP 404 → provider attempt(s) failed.
          videos: [
            "https://example.com/flowpilot-e2e-missing-a.mp4",
            "https://example.com/flowpilot-e2e-missing-b.mp4",
          ],
          transition: "none",
        },
        config: {},
      },
    },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

describeE2E("E2E-06 failed node partial outputs", () => {
  test("partial success outputs + failed attempts visible", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    test.info().annotations.push({
      type: "skip-reason-if-no-clerk",
      description: CLERK_E2E_SKIP_REASON,
    });

    await signInWithClerk(page);
    const workflowId = await openNewWorkflowEditor(page);

    await patchWorkflowGraph(page, workflowId, PARTIAL_FAIL_GRAPH);
    await reloadEditor(page);

    await playWorkflow(page);
    await waitHistoryRunStatus(page, "failed", 150_000);

    await selectLatestHistoryRun(page);

    const nodeA = page.locator(
      '[data-testid^="run-detail-node-"][data-node-id="A"]',
    );
    const nodeB = page.locator(
      '[data-testid^="run-detail-node-"][data-node-id="B"]',
    );
    await expect(nodeA).toHaveAttribute("data-status", "completed");
    await expect(nodeB).toHaveAttribute("data-status", "failed");

    // Partial output from successful A.
    await expect(nodeA.getByTestId("run-detail-node-output")).toBeVisible();
    await expect(nodeA.getByTestId("run-detail-node-output")).not.toHaveText(
      /^\s*$/,
    );

    // Failed B shows error + at least one attempt row.
    await expect(nodeB.getByTestId("run-detail-node-error")).toBeVisible();
    await expect(nodeB.getByTestId("run-detail-node-attempts")).toBeVisible();
    await expect(
      nodeB.locator('[data-testid^="run-detail-attempt-"]').first(),
    ).toBeVisible();

    // Canvas keeps completed chrome on A alongside failed on B.
    await expect(
      page.locator('[data-testid="flow-node-A"][data-status="completed"]'),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator('[data-testid="flow-node-B"][data-status="failed"]'),
    ).toBeVisible();
  });
});
