import { http, HttpResponse } from "msw";

const BASE = "http://localhost:3001";

export const workflowFixtures = {
  list: [
    {
      id: "wf_1",
      name: "My First Workflow",
      updatedAt: "2026-07-29T10:00:00.000Z",
    },
    {
      id: "wf_2",
      name: "Image Pipeline",
      updatedAt: "2026-07-28T15:30:00.000Z",
    },
  ],
  created: {
    id: "wf_new",
    name: "Untitled Workflow",
    graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    createdAt: "2026-07-29T12:00:00.000Z",
    updatedAt: "2026-07-29T12:00:00.000Z",
  },
  detail: {
    id: "wf_1",
    name: "My First Workflow",
    graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    createdAt: "2026-07-29T09:00:00.000Z",
    updatedAt: "2026-07-29T10:00:00.000Z",
  },
};

export const runFixtures = {
  workflowRunId: "run_wf_1",
  nodeRunId: "run_node_1",
  subscribeToken: "sub_tok_test",
};

export const historyFixtures = {
  runs: [
    {
      id: "run_hist_1",
      workflowId: "wf_1",
      status: "completed" as const,
      scope: "workflow" as const,
      createdAt: "2026-07-30T10:00:00.000Z",
      completedAt: "2026-07-30T10:00:05.000Z",
      durationMs: 5000,
      costCredits: 100,
      costDisplayM: 0.0001,
    },
    {
      id: "run_hist_2",
      workflowId: "wf_1",
      status: "running" as const,
      scope: "node" as const,
      createdAt: "2026-07-30T10:01:00.000Z",
      completedAt: null,
      durationMs: null,
      costCredits: null,
    },
    {
      id: "run_hist_failed",
      workflowId: "wf_1",
      status: "failed" as const,
      scope: "workflow" as const,
      createdAt: "2026-07-30T10:02:00.000Z",
      completedAt: "2026-07-30T10:02:03.000Z",
      durationMs: 3000,
      costCredits: 210_000,
      costDisplayM: 0.21,
    },
  ],
};

/** GET /api/v1/runs/:id fixtures (doc 07 Slice 3). */
export const runDetailFixtures = {
  run_hist_1: {
    run: {
      id: "run_hist_1",
      workflowId: "wf_1",
      status: "completed" as const,
      triggerRunId: "trg_1",
      error: null,
      createdAt: "2026-07-30T10:00:00.000Z",
      updatedAt: "2026-07-30T10:00:05.000Z",
      completedAt: "2026-07-30T10:00:05.000Z",
    },
    nodes: [
      {
        id: "rn_hist_1a",
        nodeId: "node_img",
        nodeType: "gpt_image_2",
        status: "completed" as const,
        input: { prompt: "a cat" },
        output: { url: "https://cdn.example/cat.png" },
        error: null,
        attempt: 1,
        attempts: [],
        costCredits: 210_000,
        costDisplayM: 0.21,
        startedAt: "2026-07-30T10:00:01.000Z",
        completedAt: "2026-07-30T10:00:04.000Z",
      },
    ],
  },
  run_hist_failed: {
    run: {
      id: "run_hist_failed",
      workflowId: "wf_1",
      status: "failed" as const,
      triggerRunId: "trg_fail",
      error: { message: "Workflow failed" },
      createdAt: "2026-07-30T10:02:00.000Z",
      updatedAt: "2026-07-30T10:02:03.000Z",
      completedAt: "2026-07-30T10:02:03.000Z",
    },
    nodes: [
      {
        id: "rn_fail_ok",
        nodeId: "node_ok",
        nodeType: "gpt_image_2",
        status: "completed" as const,
        input: { prompt: "ok" },
        output: { url: "https://cdn.example/ok.png" },
        error: null,
        attempt: 1,
        attempts: [],
        costCredits: 210_000,
        costDisplayM: 0.21,
        startedAt: "2026-07-30T10:02:00.500Z",
        completedAt: "2026-07-30T10:02:01.500Z",
      },
      {
        id: "rn_fail_err",
        nodeId: "node_bad",
        nodeType: "kling_v3_pro",
        status: "failed" as const,
        input: { prompt: "bad", durationSec: 8 },
        output: null,
        error: {
          code: "PROVIDER_FAILED",
          message: "All providers failed",
        },
        attempt: 2,
        attempts: [
          {
            id: "att_fail_1",
            providerId: "stub.kling_v3_pro",
            startedAt: "2026-07-30T10:02:01.500Z",
            endedAt: "2026-07-30T10:02:02.000Z",
            error: {
              code: "PROVIDER_TIMEOUT",
              message: "Provider timed out waiting for webhook",
            },
            outcome: "timeout" as const,
          },
          {
            id: "att_fail_2",
            providerId: "stub.kling_fallback",
            startedAt: "2026-07-30T10:02:02.000Z",
            endedAt: "2026-07-30T10:02:03.000Z",
            error: {
              code: "PROVIDER_FAILED",
              message: "Stub provider rejected request",
            },
            outcome: "failed" as const,
          },
        ],
        logs: [
          {
            at: "2026-07-30T10:02:01.500Z",
            level: "info",
            message: "Trying provider stub.kling_v3_pro (attempt 1/2)",
            providerId: "stub.kling_v3_pro",
          },
          {
            at: "2026-07-30T10:02:02.000Z",
            level: "error",
            message:
              "Provider stub.kling_v3_pro timed out — trying next in chain",
            providerId: "stub.kling_v3_pro",
          },
          {
            at: "2026-07-30T10:02:02.000Z",
            level: "info",
            message: "Trying provider stub.kling_fallback (attempt 2/2)",
            providerId: "stub.kling_fallback",
          },
          {
            at: "2026-07-30T10:02:03.000Z",
            level: "error",
            message: "Stub provider rejected request",
            providerId: "stub.kling_fallback",
          },
        ],
        costCredits: null,
        startedAt: "2026-07-30T10:02:01.500Z",
        completedAt: "2026-07-30T10:02:03.000Z",
      },
    ],
  },
};

const now = "2026-07-29T12:00:00.000Z";

/** Credits balance + estimate fixtures (doc 08 Slice 4). */
export const creditsFixtures = {
  balance: {
    balance: 10_000_000,
    displayM: 10,
  },
  estimate: {
    total: 1_720_000,
    displayM: 1.72,
    perNode: [
      {
        nodeId: "node_img",
        type: "gpt_image_2",
        credits: 210_000,
        displayM: 0.21,
      },
      {
        nodeId: "node_vid",
        type: "seedance_2_0",
        credits: 1_510_000,
        displayM: 1.51,
      },
    ],
  },
};

/** GET /credits + POST /credits/estimate (doc 08 Slice 4). */
export const creditsHandlers = [
  http.get(`${BASE}/api/v1/credits`, () => {
    return HttpResponse.json(creditsFixtures.balance);
  }),

  http.post(`${BASE}/api/v1/credits/estimate`, () => {
    return HttpResponse.json(creditsFixtures.estimate);
  }),
];

/** GET /api/v1/workflows/:id/runs — history list (doc 07 Slice 2). */
export const historyHandlers = [
  http.get(`${BASE}/api/v1/workflows/:id/runs`, ({ params }) => {
    const workflowId = params.id as string;
    return HttpResponse.json({
      runs: historyFixtures.runs.map((run) => ({
        ...run,
        workflowId,
      })),
    });
  }),

  http.get(`${BASE}/api/v1/runs/:id`, ({ params }) => {
    const id = params.id as string;
    if (id === "run_hist_failed") {
      return HttpResponse.json(runDetailFixtures.run_hist_failed);
    }
    if (id === "run_hist_2") {
      return HttpResponse.json({
        run: {
          id: "run_hist_2",
          workflowId: "wf_1",
          status: "running",
          triggerRunId: null,
          error: null,
          createdAt: "2026-07-30T10:01:00.000Z",
          updatedAt: "2026-07-30T10:01:00.000Z",
          completedAt: null,
        },
        nodes: [
          {
            id: "rn_hist_2a",
            nodeId: "node_1",
            nodeType: "gpt_image_2",
            status: "running",
            input: { prompt: "in progress" },
            output: null,
            error: null,
            attempt: 1,
            attempts: [],
            costCredits: null,
            startedAt: "2026-07-30T10:01:00.000Z",
            completedAt: null,
          },
        ],
      });
    }
    return HttpResponse.json(runDetailFixtures.run_hist_1);
  }),
];

export const runHandlers = [
  ...historyHandlers,

  http.post(`${BASE}/api/v1/workflows/:id/runs`, () => {
    return HttpResponse.json(
      { runId: runFixtures.workflowRunId },
      { status: 201 },
    );
  }),

  http.post(`${BASE}/api/v1/runs/node`, async ({ request }) => {
    const body = (await request.json()) as {
      workflowId?: string;
      nodeId?: string;
    };
    return HttpResponse.json(
      {
        run: {
          id: runFixtures.nodeRunId,
          workflowId: body.workflowId ?? "wf_1",
          status: "queued",
          triggerRunId: null,
          error: null,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        },
        nodes: [
          {
            id: "rn_1",
            nodeId: body.nodeId ?? "node_1",
            nodeType: "gpt_image_2",
            status: "queued",
            input: {},
            output: null,
            error: null,
            attempt: 1,
            attempts: [],
            costCredits: null,
            startedAt: null,
            completedAt: null,
          },
        ],
      },
      { status: 201 },
    );
  }),

  http.post(`${BASE}/api/v1/runs/:id/subscribe`, ({ params }) => {
    return HttpResponse.json({
      token: runFixtures.subscribeToken,
      channel: `run:${params.id as string}`,
      expiresAt: "2026-07-29T12:10:00.000Z",
    });
  }),
];

/** GET/POST/DELETE /api/v1/api-keys (doc 10 Slice 6). */
export const apiKeyFixtures = {
  list: {
    keys: [
      {
        id: "key_active",
        name: "Production",
        prefix: "fp_abcd12",
        createdAt: "2026-07-30T10:00:00.000Z",
        revokedAt: null,
      },
      {
        id: "key_revoked",
        name: "Old",
        prefix: "fp_oldkey",
        createdAt: "2026-07-29T10:00:00.000Z",
        revokedAt: "2026-07-30T09:00:00.000Z",
      },
    ],
  },
  created: {
    id: "key_new",
    name: "Staging",
    key: "fp_only_shown_once_secret_value",
    prefix: "fp_only_s",
  },
};

let apiKeysStore = structuredClone(apiKeyFixtures.list.keys);

export function resetApiKeysMswState() {
  apiKeysStore = structuredClone(apiKeyFixtures.list.keys);
}

export const apiKeysHandlers = [
  http.get(`${BASE}/api/v1/api-keys`, () => {
    return HttpResponse.json({ keys: apiKeysStore });
  }),

  http.post(`${BASE}/api/v1/api-keys`, async ({ request }) => {
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim() || "Untitled";
    const created = {
      ...apiKeyFixtures.created,
      name,
      id: `key_${Date.now()}`,
    };
    apiKeysStore = [
      {
        id: created.id,
        name: created.name,
        prefix: created.prefix,
        createdAt: "2026-07-30T12:00:00.000Z",
        revokedAt: null,
      },
      ...apiKeysStore,
    ];
    return HttpResponse.json(
      {
        id: created.id,
        name: created.name,
        key: apiKeyFixtures.created.key,
        prefix: created.prefix,
      },
      { status: 201 },
    );
  }),

  http.delete(`${BASE}/api/v1/api-keys/:id`, ({ params }) => {
    const id = params.id as string;
    const now = "2026-07-30T12:30:00.000Z";
    apiKeysStore = apiKeysStore.map((k) =>
      k.id === id ? { ...k, revokedAt: now } : k,
    );
    return HttpResponse.json({ id, revokedAt: now });
  }),
];

export const workflowHandlers = [
  http.get(`${BASE}/api/v1/workflows`, () => {
    return HttpResponse.json({ workflows: workflowFixtures.list });
  }),

  http.post(`${BASE}/api/v1/workflows`, () => {
    return HttpResponse.json(workflowFixtures.created, { status: 201 });
  }),

  http.get(`${BASE}/api/v1/workflows/:id`, ({ params }) => {
    return HttpResponse.json({
      ...workflowFixtures.detail,
      id: params.id as string,
    });
  }),

  http.patch(`${BASE}/api/v1/workflows/:id`, async ({ params, request }) => {
    const body = (await request.json()) as {
      name?: string;
      graph?: unknown;
    };
    return HttpResponse.json({
      ...workflowFixtures.detail,
      id: params.id as string,
      name: body.name ?? workflowFixtures.detail.name,
      graph: body.graph ?? workflowFixtures.detail.graph,
    });
  }),

  http.delete(`${BASE}/api/v1/workflows/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  ...creditsHandlers,
  ...runHandlers,
  ...apiKeysHandlers,
];
