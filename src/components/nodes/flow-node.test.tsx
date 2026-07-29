import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { FlowNode } from "./flow-node";
import { useEditorStore } from "@/store/editor-store";
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
  it("renders label, Run stub, primary fields, and No output yet", () => {
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

  it("shows credit estimate", () => {
    const { node, getByTestId } = renderFlowNode();
    expect(getByTestId(`flow-node-credits-${node.id}`)).toHaveTextContent(
      "~0.21M",
    );
  });
});
