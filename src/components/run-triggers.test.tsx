import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { WorkflowEditor } from "./workflow-editor";
import { FlowNode } from "@/components/nodes/flow-node";
import {
  WorkflowRunProvider,
  useWorkflowRun,
} from "@/components/workflow-run-context";
import { useEditorStore } from "@/store/editor-store";
import { useHistoryStore } from "@/store/history-store";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { runFixtures, creditsHandlers } from "@/test/msw-handlers";
import type { NodeProps } from "@xyflow/react";

const { mockGetToken } = vi.hoisted(() => ({
  mockGetToken: vi.fn(async () => "test-token"),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
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

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  closed = false;
  private readonly listeners = new Map<
    string,
    Set<(ev: MessageEvent) => void>
  >();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (ev: MessageEvent) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  close() {
    this.closed = true;
  }

  dispatch(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

/** Minimal status mirror so FlowNode-only tests can assert banner state. */
function RunStatusProbe() {
  const ctx = useWorkflowRun();
  if (!ctx) return null;
  return (
    <div
      data-testid="run-probe"
      data-busy={ctx.isBusy ? "true" : "false"}
      data-last-run-id={ctx.lastRunId ?? ""}
      data-workflow-id={ctx.workflowId}
    >
      {ctx.status.kind === "idle" ? null : ctx.status.kind === "starting" ? (
        <p data-testid="run-status" data-kind="starting" />
      ) : ctx.status.kind === "started" ? (
        <p
          data-testid="run-status"
          data-kind="started"
          data-run-id={ctx.status.runId}
        />
      ) : (
        <p data-testid="run-status" data-kind="error">
          {ctx.status.message}
        </p>
      )}
    </div>
  );
}

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
  http.post("http://localhost:3001/api/v1/workflows/:id/runs", ({ request }) => {
    const auth = request.headers.get("Authorization");
    if (auth !== "Bearer test-token") {
      return HttpResponse.json(
        { code: "unauthorized", message: "Missing auth" },
        { status: 401 },
      );
    }
    return HttpResponse.json(
      { runId: runFixtures.workflowRunId },
      { status: 201 },
    );
  }),
  http.post("http://localhost:3001/api/v1/runs/node", async ({ request }) => {
    const auth = request.headers.get("Authorization");
    if (auth !== "Bearer test-token") {
      return HttpResponse.json(
        { code: "unauthorized", message: "Missing auth" },
        { status: 401 },
      );
    }
    const body = (await request.json()) as {
      workflowId: string;
      nodeId: string;
    };
    const now = new Date().toISOString();
    return HttpResponse.json(
      {
        run: {
          id: runFixtures.nodeRunId,
          workflowId: body.workflowId,
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
            nodeId: body.nodeId,
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
  http.post("http://localhost:3001/api/v1/runs/:id/subscribe", () =>
    HttpResponse.json({
      token: runFixtures.subscribeToken,
      channel: "run:x",
      expiresAt: "2026-07-29T12:10:00.000Z",
    }),
  ),
  ...creditsHandlers,
);

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
  useEditorStore.setState({ nodes: [], edges: [] });
  useHistoryStore.getState().reset();
  mockGetToken.mockResolvedValue("test-token");
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  server.close();
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("FE run triggers (Slice 8)", () => {
  it("Play posts workflow run with Authorization bearer", async () => {
    let capturedAuth: string | null = null;
    let capturedMethod: string | null = null;
    server.use(
      http.post(
        "http://localhost:3001/api/v1/workflows/:id/runs",
        ({ request }) => {
          capturedAuth = request.headers.get("Authorization");
          capturedMethod = request.method;
          return HttpResponse.json(
            { runId: runFixtures.workflowRunId },
            { status: 201 },
          );
        },
      ),
    );

    const { getByTestId } = render(<WorkflowEditor workflowId="wf_1" />);
    await waitFor(() =>
      expect(getByTestId("workflow-editor")).toBeInTheDocument(),
    );

    fireEvent.click(getByTestId("workflow-play"));

    await waitFor(() => {
      expect(capturedMethod).toBe("POST");
      expect(capturedAuth).toBe("Bearer test-token");
      expect(getByTestId("run-status")).toHaveAttribute("data-kind", "started");
      expect(getByTestId("run-status")).toHaveAttribute(
        "data-run-id",
        runFixtures.workflowRunId,
      );
    });
  });

  it("node Run posts /runs/node with correct nodeId", async () => {
    let capturedBody: { workflowId?: string; nodeId?: string } | null = null;
    let capturedAuth: string | null = null;
    server.use(
      http.post("http://localhost:3001/api/v1/runs/node", async ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        capturedBody = (await request.json()) as {
          workflowId: string;
          nodeId: string;
        };
        const now = new Date().toISOString();
        return HttpResponse.json(
          {
            run: {
              id: runFixtures.nodeRunId,
              workflowId: capturedBody.workflowId,
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
                nodeId: capturedBody.nodeId,
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
    );

    const node = useEditorStore.getState().addNode("gpt_image_2", {
      x: 0,
      y: 0,
    })!;
    const props = {
      id: node.id,
      type: node.type,
      data: node.data,
      selected: false,
      dragging: false,
      zIndex: 0,
      selectable: true,
      deletable: true,
      draggable: true,
      isConnectable: true,
      positionAbsoluteX: 0,
      positionAbsoluteY: 0,
    } as NodeProps;

    const { getByTestId } = render(
      <WorkflowRunProvider workflowId="wf_1">
        <FlowNode {...props} />
        <RunStatusProbe />
      </WorkflowRunProvider>,
    );

    const runBtn = getByTestId(`flow-node-run-${node.id}`);
    expect(runBtn).not.toBeDisabled();
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(capturedAuth).toBe("Bearer test-token");
      expect(capturedBody).toEqual({
        workflowId: "wf_1",
        nodeId: node.id,
      });
      expect(getByTestId("run-status")).toHaveAttribute("data-kind", "started");
    });
  });

  it("4xx error envelope message surfaces in UI", async () => {
    server.use(
      http.post("http://localhost:3001/api/v1/workflows/:id/runs", () =>
        HttpResponse.json(
          {
            code: "forbidden",
            message: "You do not own this workflow",
          },
          { status: 403 },
        ),
      ),
    );

    const { getByTestId } = render(<WorkflowEditor workflowId="wf_1" />);
    await waitFor(() =>
      expect(getByTestId("workflow-editor")).toBeInTheDocument(),
    );

    fireEvent.click(getByTestId("workflow-play"));

    await waitFor(() => {
      const banner = getByTestId("run-status");
      expect(banner).toHaveAttribute("data-kind", "error");
      expect(banner).toHaveTextContent("You do not own this workflow");
    });
  });

  it("workflowId change clears run status and lastRunId", async () => {
    const { getByTestId, rerender, queryByTestId } = render(
      <WorkflowRunProvider workflowId="wf_1">
        <RunStatusProbe />
        <PlayProbe />
      </WorkflowRunProvider>,
    );

    fireEvent.click(getByTestId("probe-play"));

    await waitFor(() => {
      expect(getByTestId("run-status")).toHaveAttribute("data-kind", "started");
      expect(getByTestId("run-probe")).toHaveAttribute(
        "data-last-run-id",
        runFixtures.workflowRunId,
      );
    });

    rerender(
      <WorkflowRunProvider workflowId="wf_2">
        <RunStatusProbe />
        <PlayProbe />
      </WorkflowRunProvider>,
    );

    await waitFor(() => {
      expect(queryByTestId("run-status")).toBeNull();
      expect(getByTestId("run-probe")).toHaveAttribute("data-last-run-id", "");
      expect(getByTestId("run-probe")).toHaveAttribute(
        "data-workflow-id",
        "wf_2",
      );
      expect(getByTestId("run-probe")).toHaveAttribute("data-busy", "false");
    });
  });

  it("isBusy stays true until subscribe finishes", async () => {
    let releaseSubscribe!: () => void;
    const subscribeGate = new Promise<void>((resolve) => {
      releaseSubscribe = resolve;
    });

    server.use(
      http.post(
        "http://localhost:3001/api/v1/runs/:id/subscribe",
        async () => {
          await subscribeGate;
          return HttpResponse.json({
            token: runFixtures.subscribeToken,
            channel: "run:x",
            expiresAt: "2026-07-29T12:10:00.000Z",
          });
        },
      ),
    );

    const { getByTestId } = render(
      <WorkflowRunProvider workflowId="wf_1">
        <RunStatusProbe />
        <PlayProbe />
      </WorkflowRunProvider>,
    );

    fireEvent.click(getByTestId("probe-play"));

    await waitFor(() => {
      expect(getByTestId("run-status")).toHaveAttribute("data-kind", "started");
      expect(getByTestId("run-probe")).toHaveAttribute("data-busy", "true");
    });

    releaseSubscribe();

    await waitFor(() => {
      expect(getByTestId("run-probe")).toHaveAttribute("data-busy", "false");
    });
  });

  it("Play seeds history store and SSE events update list status", async () => {
    const { getByTestId } = render(
      <WorkflowRunProvider workflowId="wf_1">
        <RunStatusProbe />
        <PlayProbe />
      </WorkflowRunProvider>,
    );

    fireEvent.click(getByTestId("probe-play"));

    await waitFor(() => {
      expect(getByTestId("run-status")).toHaveAttribute("data-kind", "started");
      expect(
        useHistoryStore
          .getState()
          .runs.some((r) => r.id === runFixtures.workflowRunId),
      ).toBe(true);
    });

    const source = FakeEventSource.instances[0]!;
    expect(source).toBeTruthy();

    act(() => {
      source.dispatch("run.completed", {
        type: "run.completed",
        runId: runFixtures.workflowRunId,
        status: "completed",
        at: "2026-07-30T12:00:05.000Z",
      });
    });

    await waitFor(() => {
      const entry = useHistoryStore
        .getState()
        .runs.find((r) => r.id === runFixtures.workflowRunId);
      expect(entry?.status).toBe("completed");
    });
  });

  it("unmount closes EventSource subscription", async () => {
    const { getByTestId, unmount } = render(
      <WorkflowRunProvider workflowId="wf_1">
        <RunStatusProbe />
        <PlayProbe />
      </WorkflowRunProvider>,
    );

    fireEvent.click(getByTestId("probe-play"));

    await waitFor(() => {
      expect(FakeEventSource.instances.length).toBeGreaterThan(0);
      expect(getByTestId("run-probe")).toHaveAttribute("data-busy", "false");
    });

    const source = FakeEventSource.instances[0]!;
    expect(source.closed).toBe(false);
    unmount();
    expect(source.closed).toBe(true);
  });
});

function PlayProbe() {
  const ctx = useWorkflowRun();
  return (
    <button
      type="button"
      data-testid="probe-play"
      disabled={ctx?.isBusy}
      onClick={() => void ctx?.runWorkflow()}
    >
      Play
    </button>
  );
}
