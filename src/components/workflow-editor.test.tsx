import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { WorkflowEditor } from "./workflow-editor";
import { useEditorStore } from "@/store/editor-store";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
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

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
  useEditorStore.setState({ nodes: [], edges: [] });
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  server.close();
  cleanup();
  vi.unstubAllEnvs();
});

describe("WorkflowEditor tabs", () => {
  it("defaults to Workflow tab with canvas (no inspector)", async () => {
    const { getByTestId, queryByTestId } = render(
      <WorkflowEditor workflowId="wf_1" />,
    );
    await waitFor(() => expect(getByTestId("workflow-editor")).toBeInTheDocument());
    expect(getByTestId("workflow-tab-workflow")).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(getByTestId("workflow-canvas")).toBeInTheDocument();
    expect(queryByTestId("node-inspector")).not.toBeInTheDocument();
    expect(getByTestId("workflow-back")).toHaveAttribute("href", "/");
  });

  it("switches to Playground and API placeholders", async () => {
    const { getByTestId, queryByTestId } = render(
      <WorkflowEditor workflowId="wf_1" />,
    );
    await waitFor(() => expect(getByTestId("workflow-editor")).toBeInTheDocument());

    fireEvent.click(getByTestId("workflow-tab-playground"));
    expect(getByTestId("playground-panel")).toBeInTheDocument();
    expect(queryByTestId("workflow-canvas")).not.toBeInTheDocument();

    fireEvent.click(getByTestId("workflow-tab-api"));
    expect(getByTestId("api-panel")).toBeInTheDocument();
  });
});
