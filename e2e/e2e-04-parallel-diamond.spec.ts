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
 * E2E-04: Parallel diamond A→B/C→D — both branches complete.
 * Graph seeded via authenticated API (UI diamond wiring is brittle).
 */
const describeE2E = hasClerkE2ECredentials()
  ? test.describe
  : test.describe.skip;

const DIAMOND_GRAPH = {
  nodes: [
    gptImageNode("A", { x: 0, y: 120 }, "diamond root"),
    gptImageNode("B", { x: 420, y: 0 }, "left branch"),
    gptImageNode("C", { x: 420, y: 240 }, "right branch"),
    gptImageNode("D", { x: 840, y: 120 }, "merge"),
  ],
  edges: [
    {
      id: "e_ab",
      source: "A",
      target: "B",
      sourceHandle: "out:result",
      targetHandle: "in:image_urls",
    },
    {
      id: "e_ac",
      source: "A",
      target: "C",
      sourceHandle: "out:result",
      targetHandle: "in:image_urls",
    },
    {
      id: "e_bd",
      source: "B",
      target: "D",
      sourceHandle: "out:result",
      targetHandle: "in:image_urls",
    },
    {
      id: "e_cd",
      source: "C",
      target: "D",
      sourceHandle: "out:result",
      targetHandle: "in:image_urls",
    },
  ],
  viewport: { x: 0, y: 0, zoom: 0.75 },
};

describeE2E("E2E-04 parallel diamond", () => {
  test("diamond both branches complete", async ({ page }) => {
    test.setTimeout(180_000);
    test.info().annotations.push({
      type: "skip-reason-if-no-clerk",
      description: CLERK_E2E_SKIP_REASON,
    });

    await signInWithClerk(page);
    const workflowId = await openNewWorkflowEditor(page);

    await patchWorkflowGraph(page, workflowId, DIAMOND_GRAPH);
    await reloadEditor(page);

    await expect(page.locator('[data-testid^="flow-node-"]')).toHaveCount(4, {
      timeout: 15_000,
    });

    await playWorkflow(page);
    await waitHistoryRunStatus(page, "completed", 150_000);

    await selectLatestHistoryRun(page);
    const detailNodes = page.locator('[data-testid^="run-detail-node-"]');
    await expect(detailNodes).toHaveCount(4, { timeout: 15_000 });

    for (const id of ["A", "B", "C", "D"]) {
      await expect(
        page.locator(`[data-testid^="run-detail-node-"][data-node-id="${id}"]`),
      ).toHaveAttribute("data-status", "completed");
    }

    // Parallel branches B and C both completed (canvas chrome).
    await expect(
      page.locator('[data-testid="flow-node-B"][data-status="completed"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="flow-node-C"][data-status="completed"]'),
    ).toBeVisible();
  });
});
