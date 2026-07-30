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
    },
    {
      id: "run_hist_2",
      workflowId: "wf_1",
      status: "running" as const,
      scope: "node" as const,
      createdAt: "2026-07-30T10:01:00.000Z",
      completedAt: null,
      durationMs: null,
    },
    {
      id: "run_hist_failed",
      workflowId: "wf_1",
      status: "failed" as const,
      scope: "workflow" as const,
      createdAt: "2026-07-30T10:02:00.000Z",
      completedAt: "2026-07-30T10:02:03.000Z",
      durationMs: 3000,
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
        input: { prompt: "bad" },
        output: null,
        error: { message: "Stub provider rejected request" },
        attempt: 1,
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

  ...creditsHandlers,
  ...runHandlers,
];
