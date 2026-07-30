import { expect, test } from "@playwright/test";
import {
  apiBaseUrl,
  hasPublicApiE2ECredentials,
  PUBLIC_API_E2E_SKIP_REASON,
} from "./helpers/env";

/**
 * E2E-07: API key run — public API starts run; status poll + inDetails get.
 * API-only Playwright request test (no browser UI / no Clerk).
 * Skips without E2E_API_KEY + E2E_WORKFLOW_ID; soft-skips if API down.
 */
const describeE2E = hasPublicApiE2ECredentials()
  ? test.describe
  : test.describe.skip;

describeE2E("E2E-07 API key run", () => {
  test("POST /public/runs → poll GET status → inDetails", async ({
    request,
  }) => {
    test.setTimeout(180_000);
    test.info().annotations.push({
      type: "skip-reason-if-no-api-key",
      description: PUBLIC_API_E2E_SKIP_REASON,
    });

    const api = apiBaseUrl();
    const key = process.env.E2E_API_KEY!;
    const workflowId = process.env.E2E_WORKFLOW_ID!;
    const auth = { Authorization: `Bearer ${key}` };

    const health = await request
      .get(`${api}/api/v1/health`)
      .then((r) => r.ok())
      .catch(() => false);
    test.skip(!health, `API not reachable at ${api}`);

    const me = await request.get(`${api}/api/v1/public/me`, {
      headers: auth,
    });
    if (me.status() === 401) {
      test.skip(true, "E2E_API_KEY rejected by /public/me (401)");
    }
    expect(me.ok()).toBeTruthy();

    const start = await request.post(`${api}/api/v1/public/runs`, {
      headers: {
        ...auth,
        "Content-Type": "application/json",
      },
      data: { workflowId },
    });
    expect(
      start.status(),
      `start run failed: ${start.status()} ${await start.text()}`,
    ).toBe(201);
    const started = (await start.json()) as { runId?: string };
    expect(started.runId).toBeTruthy();
    const runId = started.runId!;

    let terminal: string | undefined;
    for (let i = 0; i < 90; i++) {
      const statusRes = await request.get(
        `${api}/api/v1/public/runs/${runId}`,
        { headers: auth },
      );
      expect(statusRes.ok()).toBeTruthy();
      const body = (await statusRes.json()) as {
        run: { id: string; status: string };
        nodes?: unknown;
      };
      expect(body.run.id).toBe(runId);
      expect(body.nodes).toBeUndefined();
      terminal = body.run.status;
      if (
        terminal === "completed" ||
        terminal === "failed" ||
        terminal === "cancelled"
      ) {
        break;
      }
      await new Promise((r) => setTimeout(r, 2_000));
    }
    expect(terminal).toBe("completed");

    const detailed = await request.get(
      `${api}/api/v1/public/runs/${runId}?inDetails=true`,
      { headers: auth },
    );
    expect(detailed.ok()).toBeTruthy();
    const detail = (await detailed.json()) as {
      run: { id: string; status: string };
      nodes: Array<{ status: string }>;
    };
    expect(detail.run.id).toBe(runId);
    expect(detail.nodes.length).toBeGreaterThan(0);
    expect(detail.nodes.every((n) => n.status === "completed")).toBe(true);
  });
});
