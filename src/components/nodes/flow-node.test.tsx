import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { FlowNode } from "./flow-node";
import { useEditorStore } from "@/store/editor-store";
import { useHistoryStore } from "@/store/history-store";
import type { NodeProps } from "@xyflow/react";

vi.mock("@xyflow/react", () => ({
  Handle: ({ id }: { id?: string }) => <div data-testid={`handle-${id}`} />,
  Position: { Left: "left", Right: "right" },
  applyNodeChanges: vi.fn((changes: unknown[], nodes: unknown[]) => nodes),
  applyEdgeChanges: vi.fn((changes: unknown[], edges: unknown[]) => edges),
  addEdge: vi.fn((edge: unknown, edges: unknown[]) => [...edges, edge]),
}));

beforeEach(() => {
  useEditorStore.setState({ nodes: [], edges: [] });
  useHistoryStore.getState().reset();
});

afterEach(() => {
  cleanup();
});

function renderFlowNode() {
  const node = useEditorStore.getState().addNode("gpt_image_2", { x: 0, y: 0 })!;
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
  const result = render(<FlowNode {...props} />);
  return { node, ...result };
}

describe("FlowNode on-node settings", () => {
  it("renders label, Run (disabled without provider), primary fields, and No output yet", () => {
    const { node, getByText, getByTestId, getByLabelText } = renderFlowNode();
    expect(getByText("GPT Image 2")).toBeInTheDocument();
    expect(getByTestId(`flow-node-run-${node.id}`)).toBeDisabled();
    expect(getByLabelText("Prompt*")).toBeInTheDocument();
    expect(getByTestId(`flow-node-no-output-${node.id}`)).toHaveTextContent(
      "No output yet",
    );
  });

  it("editing a field updates store data.inputs", () => {
    const { node, getByTestId } = renderFlowNode();
    const prompt = getByTestId(`node-${node.id}-field-prompt`);
    fireEvent.change(prompt, { target: { value: "a red car" } });
    const updated = useEditorStore.getState().nodes[0];
    expect((updated.data.inputs as Record<string, unknown>).prompt).toBe(
      "a red car",
    );
  });

  it("Settings advanced fields collapsed by default", () => {
    const { node, queryByTestId, getByTestId } = renderFlowNode();
    expect(
      queryByTestId(`flow-node-settings-${node.id}`),
    ).not.toBeInTheDocument();
    fireEvent.click(getByTestId(`flow-node-settings-toggle-${node.id}`));
    expect(getByTestId(`flow-node-settings-${node.id}`)).toBeInTheDocument();
  });

  it("sub-model pills switch activeSubModelId", () => {
    const { getByTestId } = renderFlowNode();
    fireEvent.click(getByTestId("submodel-gpt-image-2-edit"));
    const config = useEditorStore.getState().nodes[0].data.config as Record<
      string,
      unknown
    >;
    expect(config.activeSubModelId).toBe("gpt-image-2-edit");
  });

  it("hides Image field in Text to Image; shows it in Image to Image", () => {
    const { queryByTestId, getByTestId } = renderFlowNode();
    expect(queryByTestId("field-row-image_urls")).not.toBeInTheDocument();
    fireEvent.click(getByTestId("submodel-gpt-image-2-edit"));
    expect(getByTestId("field-row-image_urls")).toBeInTheDocument();
  });

  it("shows credit estimate", () => {
    const { node, getByTestId } = renderFlowNode();
    expect(getByTestId(`flow-node-credits-${node.id}`)).toHaveTextContent(
      "~0.21M",
    );
  });
});

describe("FlowNode canvas live status", () => {
  it("defaults to data-status=idle without a live run", () => {
    const { node, getByTestId, queryByTestId } = renderFlowNode();
    expect(getByTestId(`flow-node-${node.id}`)).toHaveAttribute(
      "data-status",
      "idle",
    );
    expect(
      queryByTestId(`flow-node-status-badge-${node.id}`),
    ).not.toBeInTheDocument();
  });

  it("reflects liveNodeStatuses on data-status and badge", () => {
    const { node, getByTestId, rerender } = renderFlowNode();
    useHistoryStore.setState({
      liveRunId: "run_1",
      liveNodeStatuses: { [node.id]: "running" },
    });
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
    rerender(<FlowNode {...props} />);
    expect(getByTestId(`flow-node-${node.id}`)).toHaveAttribute(
      "data-status",
      "running",
    );
    expect(getByTestId(`flow-node-${node.id}`).className).toContain(
      "flow-node--status-running",
    );
    expect(getByTestId(`flow-node-status-badge-${node.id}`)).toHaveAttribute(
      "data-status",
      "running",
    );
  });

  it("shows output preview and download href from liveNodeOutputs", () => {
    const { node, getByTestId, queryByTestId, rerender } = renderFlowNode();
    const url = "https://cdn.example/done.png";
    useHistoryStore.setState({
      liveRunId: "run_1",
      liveNodeStatuses: { [node.id]: "completed" },
      liveNodeOutputs: { [node.id]: { result: [url] } },
    });
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
    rerender(<FlowNode {...props} />);

    expect(queryByTestId(`flow-node-no-output-${node.id}`)).toBeNull();
    expect(getByTestId(`flow-node-output-${node.id}`)).toHaveTextContent(
      "done.png",
    );
    const download = getByTestId(`flow-node-output-${node.id}-download-0`);
    expect(download).toHaveAttribute("href", url);
    expect(download).toHaveAttribute("download");
    expect(
      getByTestId(`flow-node-output-${node.id}-view-0`),
    ).toHaveAttribute("href", url);
  });

  it("keeps completed output visible after sibling node fails", () => {
    const { node, getByTestId, rerender } = renderFlowNode();
    const url = "https://cdn.example/ok.png";
    useHistoryStore.setState({
      liveRunId: "run_fail",
      liveNodeStatuses: {
        [node.id]: "completed",
        node_bad: "failed",
      },
      liveNodeOutputs: { [node.id]: { url } },
    });
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
    rerender(<FlowNode {...props} />);

    expect(getByTestId(`flow-node-${node.id}`)).toHaveAttribute(
      "data-status",
      "completed",
    );
    expect(getByTestId(`flow-node-${node.id}`).className).toContain(
      "border-[var(--success)]",
    );
    expect(
      getByTestId(`flow-node-output-${node.id}-download-0`),
    ).toHaveAttribute("href", url);
  });

  it("failed node keeps danger chrome while sibling stays completed", () => {
    const ok = useEditorStore.getState().addNode("gpt_image_2", { x: 0, y: 0 })!;
    const bad = useEditorStore
      .getState()
      .addNode("gpt_image_2", { x: 200, y: 0 })!;
    useHistoryStore.setState({
      liveRunId: "run_partial",
      liveNodeStatuses: {
        [ok.id]: "completed",
        [bad.id]: "failed",
      },
    });

    const baseProps = {
      selected: false,
      dragging: false,
      zIndex: 0,
      selectable: true,
      deletable: true,
      draggable: true,
      isConnectable: true,
      positionAbsoluteX: 0,
      positionAbsoluteY: 0,
    };

    const { getByTestId } = render(
      <>
        <FlowNode
          {...({
            ...baseProps,
            id: ok.id,
            type: ok.type,
            data: ok.data,
          } as NodeProps)}
        />
        <FlowNode
          {...({
            ...baseProps,
            id: bad.id,
            type: bad.type,
            data: bad.data,
          } as NodeProps)}
        />
      </>,
    );

    expect(getByTestId(`flow-node-${ok.id}`)).toHaveAttribute(
      "data-status",
      "completed",
    );
    expect(getByTestId(`flow-node-${ok.id}`).className).toContain(
      "border-[var(--success)]",
    );
    expect(getByTestId(`flow-node-${bad.id}`)).toHaveAttribute(
      "data-status",
      "failed",
    );
    expect(getByTestId(`flow-node-${bad.id}`).className).toContain(
      "border-[var(--danger)]",
    );
  });
});
