import { expect, type Page } from "@playwright/test";
import { apiBaseUrl } from "./env";

/** Sign-in already done — create workflow and open editor on Workflow tab. */
export async function openNewWorkflowEditor(page: Page): Promise<string> {
  await page.getByTestId("new-workflow-btn").click();
  await page.getByTestId("workflow-editor").waitFor({ timeout: 30_000 });
  await page.getByTestId("workflow-tab-workflow").click();
  await page.getByTestId("workflow-canvas").waitFor();

  const match = page.url().match(/\/workflows\/([^/?#]+)/);
  if (!match?.[1]) {
    throw new Error(`Expected /workflows/:id URL, got ${page.url()}`);
  }
  return match[1];
}

export async function openNodePalette(page: Page): Promise<void> {
  await page.getByTestId("palette-open").click();
  await page.getByTestId("node-palette").waitFor();
}

export async function waitForSaved(page: Page): Promise<void> {
  await expect(page.getByTestId("save-indicator")).toHaveText(/Saved/i, {
    timeout: 15_000,
  });
}

export async function playWorkflow(page: Page): Promise<void> {
  await page.getByTestId("workflow-play").click();
}

/** Clerk session JWT for direct API calls (graph seed). */
export async function clerkSessionToken(page: Page): Promise<string> {
  const token = await page.evaluate(async () => {
    const clerk = (
      window as unknown as {
        Clerk?: { session?: { getToken: () => Promise<string | null> } };
      }
    ).Clerk;
    return (await clerk?.session?.getToken()) ?? null;
  });
  if (!token) {
    throw new Error("Clerk session token unavailable — is the user signed in?");
  }
  return token;
}

export async function patchWorkflowGraph(
  page: Page,
  workflowId: string,
  graph: unknown,
): Promise<void> {
  const token = await clerkSessionToken(page);
  const res = await page.request.patch(
    `${apiBaseUrl()}/api/v1/workflows/${workflowId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { graph },
    },
  );
  if (!res.ok()) {
    throw new Error(
      `PATCH workflow graph failed: ${res.status()} ${await res.text()}`,
    );
  }
}

export async function reloadEditor(page: Page): Promise<void> {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("workflow-editor").waitFor({ timeout: 30_000 });
  await page.getByTestId("workflow-tab-workflow").click();
}

/** Add N gpt_image_2 nodes via palette; returns locators in add order. */
export async function addGptImageNodes(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await openNodePalette(page);
    await page.getByTestId("palette-search").fill("GPT Image");
    await page.getByTestId("palette-item-gpt_image_2").click();
  }
  const nodes = page.locator('[data-testid^="flow-node-"]');
  await expect(nodes).toHaveCount(count, { timeout: 10_000 });
  return nodes;
}

/**
 * Connect image[] → image[] (out:result → in:image_urls).
 * Target must be on I2I (edit) submodel so the Image handle is visible.
 */
export async function connectImageToImage(
  page: Page,
  sourceNode: ReturnType<Page["locator"]>,
  targetNode: ReturnType<Page["locator"]>,
): Promise<void> {
  await targetNode.getByTestId("submodel-gpt-image-2-edit").click();
  const source = sourceNode.locator('[data-testid="handle-out:result"]');
  const target = targetNode.locator('[data-testid="handle-in:image_urls"]');
  await source.waitFor({ state: "visible" });
  await target.waitFor({ state: "visible" });
  await source.dragTo(target);
  await page.waitForTimeout(300);
}

export async function waitHistoryRunStatus(
  page: Page,
  status: "completed" | "failed" | "running" | "cancelled",
  timeoutMs = 120_000,
): Promise<void> {
  await expect(
    page.locator(`[data-testid^="history-run-"][data-status="${status}"]`).first(),
  ).toBeVisible({ timeout: timeoutMs });
}

export async function selectLatestHistoryRun(page: Page): Promise<void> {
  const row = page.locator('[data-testid^="history-run-"]').first();
  await row.click();
  await page.getByTestId("run-detail").waitFor({ timeout: 15_000 });
}

export function gptImageNode(
  id: string,
  position: { x: number; y: number },
  prompt: string,
) {
  return {
    id,
    type: "gpt_image_2",
    position,
    data: {
      label: "GPT Image 2",
      inputs: { prompt, quality: "High", n: 1, size: "Auto" },
      config: { activeSubModelId: "gpt-image-2-text" },
    },
  };
}
