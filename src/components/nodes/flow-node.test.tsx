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

  it("header has info, reset, Run, and overflow menu", () => {
    const { node, getByTestId } = renderFlowNode();
    expect(getByTestId(`flow-node-info-${node.id}`)).toBeInTheDocument();
    expect(getByTestId(`flow-node-reset-${node.id}`)).toBeInTheDocument();
    expect(getByTestId(`flow-node-run-${node.id}`)).toHaveTextContent("Run");
    expect(getByTestId(`flow-node-menu-${node.id}`)).toBeInTheDocument();
  });

  it("overflow menu lists Duplicate, Duplicate with Edges, Lock, Delete", () => {
    const { node, getByTestId } = renderFlowNode();
    fireEvent.click(getByTestId(`flow-node-menu-${node.id}`));
    expect(getByTestId(`flow-node-menu-panel-${node.id}`)).toBeInTheDocument();
    expect(
      getByTestId(`flow-node-menu-duplicate-${node.id}`),
    ).toHaveTextContent("Duplicate");
    expect(
      getByTestId(`flow-node-menu-duplicate-edges-${node.id}`),
    ).toHaveTextContent("Duplicate with Edges");
    expect(getByTestId(`flow-node-menu-lock-${node.id}`)).toHaveTextContent(
      "Lock",
    );
    expect(getByTestId(`flow-node-menu-delete-${node.id}`)).toHaveTextContent(
      "Delete",
    );
  });

  it("menu Duplicate clones the node without edges", () => {
    const a = useEditorStore.getState().addNode("gpt_image_2", { x: 0, y: 0 })!;
    const b = useEditorStore.getState().addNode("gpt_image_2", { x: 400, y: 0 })!;
    useEditorStore.getState().onConnect({
      source: a.id,
      target: b.id,
      sourceHandle: "out:result",
      targetHandle: "in:prompt",
    });
    const props = {
      id: a.id,
      type: a.type,
      data: a.data,
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
    const { getByTestId } = render(<FlowNode {...props} />);
    fireEvent.click(getByTestId(`flow-node-menu-${a.id}`));
    fireEvent.click(getByTestId(`flow-node-menu-duplicate-${a.id}`));
    expect(useEditorStore.getState().nodes).toHaveLength(3);
    expect(useEditorStore.getState().edges).toHaveLength(1);
  });

  it("menu Delete removes the node", () => {
    const { node, getByTestId } = renderFlowNode();
    fireEvent.click(getByTestId(`flow-node-menu-${node.id}`));
    fireEvent.click(getByTestId(`flow-node-menu-delete-${node.id}`));
    expect(useEditorStore.getState().nodes).toHaveLength(0);
  });

  it("reset restores field defaults", () => {
    const { node, getByTestId } = renderFlowNode();
    fireEvent.change(getByTestId(`node-${node.id}-field-prompt`), {
      target: { value: "changed" },
    });
    expect(
      (useEditorStore.getState().nodes[0].data.inputs as Record<string, unknown>)
        .prompt,
    ).toBe("changed");
    fireEvent.click(getByTestId(`flow-node-reset-${node.id}`));
    expect(
      (useEditorStore.getState().nodes[0].data.inputs as Record<string, unknown>)
        .prompt,
    ).toBe("");
  });

  it("active sub-model pill uses mode-active token class", () => {
    const { getByTestId } = renderFlowNode();
    expect(getByTestId("submodel-gpt-image-2-text").className).toContain(
      "--mode-active",
    );
  });

  it("renders dashed upload zone for Image to Image", () => {
    const { getByTestId, getByText } = renderFlowNode();
    fireEvent.click(getByTestId("submodel-gpt-image-2-edit"));
    expect(getByText("Upload Image")).toBeInTheDocument();
    const zone = getByTestId(
      `node-${useEditorStore.getState().nodes[0].id}-field-image_urls`,
    ).closest("label");
    expect(zone?.className).toContain("--upload-dash");
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

describe("FlowNode request / response Magica chrome", () => {
  function propsFor(node: { id: string; type?: string; data: unknown }) {
    return {
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
  }

  it("Request-Inputs empty state + type menu adds text_field", () => {
    const node = useEditorStore.getState().addNode("request", { x: 0, y: 0 })!;
    const { getByTestId, getByText, queryByTestId } = render(
      <FlowNode {...propsFor(node)} />,
    );

    expect(getByText("Request-Inputs")).toBeInTheDocument();
    expect(getByTestId(`request-empty-${node.id}`)).toHaveTextContent(
      /No fields added yet/,
    );
    expect(queryByTestId(`flow-node-run-${node.id}`)).not.toBeInTheDocument();

    fireEvent.click(getByTestId(`request-add-field-${node.id}`));
    expect(getByTestId(`request-field-type-menu-${node.id}`)).toBeInTheDocument();
    for (const t of [
      "text",
      "number",
      "boolean",
      "image",
      "audio",
      "video",
      "media",
      "file",
    ]) {
      expect(getByTestId(`request-field-type-${t}`)).toBeInTheDocument();
    }

    fireEvent.click(getByTestId("request-field-type-text"));
    const stored = useEditorStore.getState().nodes[0]!.data as {
      dynamicFields: Array<{ name: string; type: string }>;
      inputs: { dynamicFields: unknown[] };
    };
    expect(stored.dynamicFields).toHaveLength(1);
    expect(stored.dynamicFields[0]!.name).toBe("text_field");
    expect(stored.dynamicFields[0]!.type).toBe("text");
    expect(stored.inputs.dynamicFields).toHaveLength(1);
  });

  it("Response empty copy is No output added yet", () => {
    const node = useEditorStore.getState().addNode("response", { x: 0, y: 0 })!;
    const { getByTestId, getByText, queryByTestId } = render(
      <FlowNode {...propsFor(node)} />,
    );
    expect(getByText("Response")).toBeInTheDocument();
    expect(getByTestId(`response-empty-${node.id}`)).toHaveTextContent(
      "No output added yet",
    );
    expect(getByTestId("handle-result")).toBeInTheDocument();
    expect(queryByTestId(`flow-node-run-${node.id}`)).not.toBeInTheDocument();
  });
});
