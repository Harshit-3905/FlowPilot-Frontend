import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { WorkflowEditor } from "@/components/workflow-editor";
import { useEditorStore } from "@/store/editor-store";
import { useHistoryStore } from "@/store/history-store";
import { buildPythonSample } from "@/components/api-panel";
import { creditsHandlers } from "@/test/msw-handlers";

const server = setupServer(
  http.get("http://localhost:3001/api/v1/workflows/:id/runs", () =>
    HttpResponse.json({ runs: [] }),
  ),
  http.get("http://localhost:3001/api/v1/workflows/:id", () =>
    HttpResponse.json({
      id: "wf_1",
      name: "AI Racing Car",
      graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ),
  http.patch("http://localhost:3001/api/v1/workflows/:id", () =>
    HttpResponse.json({ id: "wf_1" }),
  ),
  http.post("http://localhost:3001/api/v1/workflows/:id/runs", () =>
    HttpResponse.json({ runId: "run_wf_1" }, { status: 201 }),
  ),
  http.post("http://localhost:3001/api/v1/runs/:id/subscribe", () =>
    HttpResponse.json({
      token: "sub_tok",
      channel: "run:x",
      expiresAt: "2026-07-29T12:10:00.000Z",
    }),
  ),
  ...creditsHandlers,
);

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("tok_test"),
    isSignedIn: true,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="workflow-canvas">{children}</div>
  ),
  Background: () => <div data-testid="rf-background" />,
  MiniMap: () => <div data-testid="rf-minimap" />,
  Controls: () => null,
  Panel: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Handle: () => null,
  Position: { Left: "left", Right: "right" },
  BackgroundVariant: { Dots: "dots" },
  useReactFlow: () => ({
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    fitView: vi.fn(),
    getZoom: () => 1,
  }),
  useStore: (sel: (s: { transform: number[] }) => unknown) =>
    sel({ transform: [0, 0, 1] }),
  applyNodeChanges: vi.fn((c: unknown[], n: unknown[]) => n),
  applyEdgeChanges: vi.fn((c: unknown[], e: unknown[]) => e),
  addEdge: vi.fn((edge: unknown, edges: unknown[]) => [...edges, edge]),
}));

beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  useEditorStore.setState({ nodes: [], edges: [] });
  useHistoryStore.getState().reset();
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

describe("Playground + API tab fidelity", () => {
  it("Playground: Inputs / Output / Run History + CTA + empty copy", async () => {
    const { getByTestId } = render(<WorkflowEditor workflowId="wf_1" />);
    await waitFor(() =>
      expect(getByTestId("workflow-editor")).toBeInTheDocument(),
    );

    fireEvent.click(getByTestId("workflow-tab-playground"));
    expect(getByTestId("playground-panel")).toBeInTheDocument();
    expect(getByTestId("playground-inputs")).toBeInTheDocument();
    expect(getByTestId("playground-output")).toBeInTheDocument();
    expect(getByTestId("playground-run-history")).toBeInTheDocument();

    const run = getByTestId("playground-run");
    expect(run).toHaveTextContent("Run");
    expect(run.className).toContain("accent-primary-cta");

    expect(getByTestId("playground-empty-output")).toHaveTextContent(
      "No output yet",
    );
    expect(getByTestId("playground-history-empty")).toHaveTextContent(
      "No UI run yet.",
    );
  });

  it("Playground shows request dynamicFields as inputs", async () => {
    server.use(
      http.get("http://localhost:3001/api/v1/workflows/:id", () =>
        HttpResponse.json({
          id: "wf_1",
          name: "AI Racing Car",
          graph: {
            nodes: [
              {
                id: "node_1772800705319_request",
                type: "request",
                position: { x: 0, y: 0 },
                data: {
                  label: "Request-Inputs",
                  inputs: {},
                  config: {},
                  outputs: {},
                  dynamicFields: [
                    {
                      id: "field_car",
                      name: "Car prompt",
                      type: "text",
                      value: "",
                    },
                  ],
                },
              },
            ],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ),
    );

    const { getByTestId } = render(<WorkflowEditor workflowId="wf_1" />);
    await waitFor(() =>
      expect(getByTestId("workflow-editor")).toBeInTheDocument(),
    );
    fireEvent.click(getByTestId("workflow-tab-playground"));
    expect(getByTestId("playground-input-field_car")).toHaveTextContent(
      "Car prompt",
    );
    expect(getByTestId("playground-field-field_car")).toHaveAttribute(
      "placeholder",
      "Enter Car prompt...",
    );
  });

  it("API tab: POST /api/v1/runs, inDetails poll, webhooks, mono Python", async () => {
    const { getByTestId } = render(<WorkflowEditor workflowId="wf_1" />);
    await waitFor(() =>
      expect(getByTestId("workflow-editor")).toBeInTheDocument(),
    );

    fireEvent.click(getByTestId("workflow-tab-api"));
    expect(getByTestId("api-panel")).toBeInTheDocument();

    expect(getByTestId("api-endpoint-post")).toHaveTextContent("POST");
    expect(getByTestId("api-endpoint-post")).toHaveTextContent("/api/v1/runs");
    expect(getByTestId("api-endpoint-get")).toHaveTextContent(
      "/v1/runs/{runId}?inDetails=true",
    );

    const python = getByTestId("api-python-sample");
    expect(python.className).toContain("font-geist-mono");
    expect(python).toHaveTextContent("/api/v1/runs");
    expect(python).toHaveTextContent("inDetails=false");
    expect(python).toHaveTextContent("import requests");

    expect(getByTestId("api-webhooks")).toHaveTextContent(
      "Webhooks (Optional)",
    );
    expect(getByTestId("api-webhooks-snippet")).toHaveTextContent(
      "run.completed",
    );
    expect(getByTestId("api-webhooks-snippet")).toHaveTextContent("run.failed");
  });

  it("buildPythonSample includes workflowId and poll path", () => {
    const sample = buildPythonSample("wf_abc", '    "node_x": {}');
    expect(sample).toContain('"workflowId": "wf_abc"');
    expect(sample).toContain("/api/v1/runs");
    expect(sample).toContain("?inDetails=false");
  });
});
