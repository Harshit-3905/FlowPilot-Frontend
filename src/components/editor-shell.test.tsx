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
import { WorkflowEditor } from "./workflow-editor";
import { useEditorStore } from "@/store/editor-store";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { creditsHandlers, creditsFixtures } from "@/test/msw-handlers";

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
  useAuth: () => ({ getToken: async () => "tok" }),
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
    <div data-testid="react-flow">{children}</div>
  ),
  MiniMap: () => <div data-testid="minimap" />,
  Controls: () => <div data-testid="rf-controls" />,
  Background: () => <div data-testid="rf-background" />,
  BackgroundVariant: { Dots: "dots" },
  Handle: ({ id }: { id?: string }) => <div data-testid={`handle-${id}`} />,
  Position: { Left: "left", Right: "right" },
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
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

describe("Canvas chrome (13C)", () => {
  it("renders editor chrome", async () => {
    const { getByTestId, queryByTestId } = render(
      <WorkflowEditor workflowId="wf_1" />,
    );
    await waitFor(() =>
      expect(getByTestId("workflow-editor")).toBeInTheDocument(),
    );
    expect(getByTestId("workflow-editor-header")).toBeInTheDocument();
    expect(getByTestId("workflow-title-pill")).toBeInTheDocument();
    expect(getByTestId("workflow-back")).toHaveAttribute("href", "/");
    expect(getByTestId("workflow-canvas")).toBeInTheDocument();
    expect(getByTestId("palette-open")).toBeInTheDocument();
    expect(getByTestId("history-toggle")).toBeInTheDocument();
    expect(getByTestId("workflow-play")).toBeInTheDocument();
    expect(getByTestId("canvas-zoom-controls")).toBeInTheDocument();
    expect(getByTestId("canvas-center-dock")).toBeInTheDocument();
    expect(getByTestId("canvas-minimap-toggle")).toBeInTheDocument();
    expect(queryByTestId("node-palette")).not.toBeInTheDocument();
    expect(queryByTestId("history-sidebar")).not.toBeInTheDocument();
  });

  it("defaults to Workflow tab; switches Playground and API", async () => {
    const { getByTestId, queryByTestId } = render(
      <WorkflowEditor workflowId="wf_1" />,
    );
    await waitFor(() =>
      expect(getByTestId("workflow-editor")).toBeInTheDocument(),
    );
    expect(getByTestId("workflow-tab-workflow")).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(getByTestId("workflow-tab-playground")).toBeInTheDocument();
    expect(getByTestId("workflow-tab-api")).toBeInTheDocument();
    expect(queryByTestId("node-inspector")).not.toBeInTheDocument();

    fireEvent.click(getByTestId("workflow-tab-playground"));
    expect(getByTestId("playground-panel")).toBeInTheDocument();
    expect(queryByTestId("workflow-canvas")).not.toBeInTheDocument();

    fireEvent.click(getByTestId("workflow-tab-api"));
    expect(getByTestId("api-panel")).toBeInTheDocument();
  });

  it("opens history from clock and palette from +", async () => {
    const { getByTestId } = render(<WorkflowEditor workflowId="wf_1" />);
    await waitFor(() =>
      expect(getByTestId("workflow-editor")).toBeInTheDocument(),
    );
    fireEvent.click(getByTestId("history-toggle"));
    expect(getByTestId("history-sidebar")).toBeInTheDocument();
    fireEvent.click(getByTestId("palette-open"));
    expect(getByTestId("node-palette")).toBeInTheDocument();
    expect(getByTestId("palette-cat-IMAGE")).toBeInTheDocument();
    expect(getByTestId("palette-cat-VIDEO")).toBeInTheDocument();
    expect(getByTestId("palette-cat-AUDIO")).toBeInTheDocument();
    expect(getByTestId("palette-cat-OTHERS")).toBeInTheDocument();
    expect(getByTestId("palette-search")).toHaveAttribute(
      "placeholder",
      "Search nodes or models...",
    );
  });

  it("shows Est/Bal and opens history on Play", async () => {
    const { getByTestId } = render(<WorkflowEditor workflowId="wf_1" />);
    await waitFor(() => {
      expect(getByTestId("credits-est")).toHaveTextContent("Est 1.72 M");
      expect(getByTestId("credits-bal")).toHaveTextContent("Bal 10.00 M");
    });
    expect(getByTestId("credits-est")).toHaveAttribute(
      "data-value",
      String(creditsFixtures.estimate.displayM),
    );
    fireEvent.click(getByTestId("workflow-play"));
    await waitFor(() =>
      expect(getByTestId("history-sidebar")).toBeInTheDocument(),
    );
  });

  it("POSTs estimate with workflowId on load", async () => {
    let estimateBody: unknown = null;
    server.use(
      http.post(
        "http://localhost:3001/api/v1/credits/estimate",
        async ({ request }) => {
          estimateBody = await request.json();
          return HttpResponse.json(creditsFixtures.estimate);
        },
      ),
    );

    render(<WorkflowEditor workflowId="wf_1" />);
    await waitFor(() => {
      expect(estimateBody).toEqual({ workflowId: "wf_1" });
    });
  });

  it("shows insufficient hint when estimate exceeds balance", async () => {
    server.use(
      http.get("http://localhost:3001/api/v1/credits", () =>
        HttpResponse.json({ balance: 0, displayM: 0 }),
      ),
    );

    const { getByTestId } = render(<WorkflowEditor workflowId="wf_1" />);
    await waitFor(() =>
      expect(getByTestId("credits-insufficient-hint")).toHaveTextContent(
        "Insufficient credits",
      ),
    );
    expect(getByTestId("credits-bal")).toHaveTextContent("Bal 0.00 M");
  });

  it("refreshes estimate before Play", async () => {
    let estimateCalls = 0;
    server.use(
      http.post("http://localhost:3001/api/v1/credits/estimate", () => {
        estimateCalls += 1;
        return HttpResponse.json(creditsFixtures.estimate);
      }),
    );

    const { getByTestId } = render(<WorkflowEditor workflowId="wf_1" />);
    await waitFor(() =>
      expect(getByTestId("credits-est")).toHaveTextContent("Est 1.72 M"),
    );
    const afterLoad = estimateCalls;
    expect(afterLoad).toBeGreaterThanOrEqual(1);

    fireEvent.click(getByTestId("workflow-play"));

    await waitFor(() => {
      expect(estimateCalls).toBeGreaterThan(afterLoad);
    });
  });

  it("opens palette from AppShell rail event", async () => {
    const { getByTestId } = render(<WorkflowEditor workflowId="wf_1" />);
    await waitFor(() =>
      expect(getByTestId("workflow-editor")).toBeInTheDocument(),
    );
    window.dispatchEvent(new Event("flowpilot:open-palette"));
    expect(getByTestId("node-palette")).toBeInTheDocument();
  });
});
