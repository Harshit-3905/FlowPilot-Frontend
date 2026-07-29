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
];
