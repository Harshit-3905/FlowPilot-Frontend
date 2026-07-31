import { describe, expect, it, beforeEach } from "vitest";
import { useEditorStore } from "./editor-store";
import { getNode } from "@/contracts/node-definition";

beforeEach(() => {
  useEditorStore.setState({ nodes: [], edges: [] });
});

describe("addNode", () => {
  it("adds a gpt_image_2 node with correct defaults", () => {
    const node = useEditorStore.getState().addNode("gpt_image_2");
    expect(node).toBeDefined();
    expect(node!.id).toMatch(/^gpt_image_2_/);
    expect(node!.type).toBe("gpt_image_2");
    expect(node!.width).toBe(380);

    const { nodes } = useEditorStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toBe(node);
  });

  it("populates data.inputs from definition field defaults", () => {
    const node = useEditorStore.getState().addNode("gpt_image_2")!;
    const inputs = node.data.inputs as Record<string, unknown>;
    expect(inputs.prompt).toBe("");
    expect(inputs.size).toBe("Auto");
    expect(inputs.quality).toBe("High");
    expect(inputs.n).toBe(1);
    expect(inputs.background).toBe("Auto");
    expect(inputs.output_format).toBe("PNG");
    expect(inputs.output_compression).toBe(80);
    expect(inputs.image_urls).toBeNull();
  });

  it("sets data.label from definition displayName", () => {
    const node = useEditorStore.getState().addNode("gpt_image_2")!;
    expect(node.data.label).toBe("GPT Image 2");
  });

  it("sets data.config.activeSubModelId from first subModel", () => {
    const node = useEditorStore.getState().addNode("gpt_image_2")!;
    const config = node.data.config as Record<string, unknown>;
    expect(config.activeSubModelId).toBe("gpt-image-2-text");
  });

  it("uses provided position", () => {
    const node = useEditorStore.getState().addNode("gpt_image_2", { x: 100, y: 200 })!;
    expect(node.position).toEqual({ x: 100, y: 200 });
  });

  it("returns undefined for unknown node type", () => {
    const node = useEditorStore.getState().addNode("nonexistent");
    expect(node).toBeUndefined();
    expect(useEditorStore.getState().nodes).toHaveLength(0);
  });

  it("generates unique ids for multiple adds", () => {
    const a = useEditorStore.getState().addNode("gpt_image_2")!;
    const b = useEditorStore.getState().addNode("gpt_image_2")!;
    expect(a.id).not.toBe(b.id);
    expect(useEditorStore.getState().nodes).toHaveLength(2);
  });

  it("handle ids match definition handles", () => {
    const def = getNode("gpt_image_2")!;
    const node = useEditorStore.getState().addNode("gpt_image_2")!;
    expect(node.type).toBe(def.type);
    const inputIds = def.ui.handles.inputs.map((h) => h.id);
    const outputIds = def.ui.handles.outputs.map((h) => h.id);
    expect(inputIds).toContain("in:prompt");
    expect(outputIds).toContain("out:result");
  });
});

describe("viewport & graph DTO", () => {
  it("setViewport updates viewport", () => {
    useEditorStore.getState().setViewport({ x: 100, y: 200, zoom: 1.5 });
    expect(useEditorStore.getState().viewport).toEqual({ x: 100, y: 200, zoom: 1.5 });
  });

  it("loadGraph restores nodes, edges, and viewport", () => {
    const dto = {
      nodes: [{ id: "n1", type: "gpt_image_2", position: { x: 0, y: 0 }, data: {} }] as import("@xyflow/react").Node[],
      edges: [{ id: "e1", source: "n1", target: "n2" }] as import("@xyflow/react").Edge[],
      viewport: { x: 50, y: 75, zoom: 2 },
    };
    useEditorStore.getState().loadGraph(dto);
    const state = useEditorStore.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.edges).toHaveLength(1);
    expect(state.viewport).toEqual({ x: 50, y: 75, zoom: 2 });
  });

  it("toGraphDTO returns current state", () => {
    useEditorStore.getState().addNode("gpt_image_2", { x: 10, y: 20 });
    useEditorStore.getState().setViewport({ x: 5, y: 10, zoom: 0.8 });
    const dto = useEditorStore.getState().toGraphDTO();
    expect(dto.nodes).toHaveLength(1);
    expect(dto.viewport).toEqual({ x: 5, y: 10, zoom: 0.8 });
  });
});

describe("deleteSelected", () => {
  it("removes selected nodes and their connected edges", () => {
    const store = useEditorStore.getState();
    store.addNode("gpt_image_2", { x: 0, y: 0 });
    store.addNode("gpt_image_2", { x: 400, y: 0 });
    const { nodes } = useEditorStore.getState();
    const [n1, n2] = nodes;

    useEditorStore.setState({
      nodes: [
        { ...n1, selected: true },
        n2,
      ],
      edges: [
        { id: "e1", source: n1.id, target: n2.id, sourceHandle: "out:result", targetHandle: "in:prompt" },
      ],
    });

    useEditorStore.getState().deleteSelected();
    const state = useEditorStore.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].id).toBe(n2.id);
    expect(state.edges).toHaveLength(0);
  });

  it("removes selected edges", () => {
    useEditorStore.setState({
      nodes: [],
      edges: [
        { id: "e1", source: "a", target: "b", selected: true },
        { id: "e2", source: "b", target: "c" },
      ],
    });
    useEditorStore.getState().deleteSelected();
    expect(useEditorStore.getState().edges).toHaveLength(1);
    expect(useEditorStore.getState().edges[0].id).toBe("e2");
  });
});

describe("onConnect", () => {
  it("adds a colored edge from source handle dataType", () => {
    const store = useEditorStore.getState();
    store.addNode("gpt_image_2", { x: 0, y: 0 });
    store.addNode("gpt_image_2", { x: 400, y: 0 });
    const { nodes } = useEditorStore.getState();
    useEditorStore.getState().onConnect({
      source: nodes[0].id,
      target: nodes[1].id,
      sourceHandle: "out:result",
      targetHandle: "in:image_urls",
    });
    const { edges } = useEditorStore.getState();
    expect(edges).toHaveLength(1);
    expect(edges[0].style?.stroke).toBe("#3b82f6");
  });
});

describe("duplicateSelected", () => {
  it("clones selected nodes with new ids and offset position", () => {
    const store = useEditorStore.getState();
    store.addNode("gpt_image_2", { x: 100, y: 100 });
    const { nodes } = useEditorStore.getState();
    useEditorStore.setState({
      nodes: [{ ...nodes[0], selected: true }],
    });

    useEditorStore.getState().duplicateSelected();
    const state = useEditorStore.getState();
    expect(state.nodes).toHaveLength(2);
    expect(state.nodes[1].id).not.toBe(state.nodes[0].id);
    expect(state.nodes[1].position).toEqual({ x: 150, y: 150 });
    expect(state.nodes[1].data).toEqual(state.nodes[0].data);
  });

  it("clones internal edges between selected nodes", () => {
    useEditorStore.setState({ nodes: [], edges: [] });
    const store = useEditorStore.getState();
    store.addNode("gpt_image_2", { x: 0, y: 0 });
    store.addNode("gpt_image_2", { x: 400, y: 0 });
    const { nodes } = useEditorStore.getState();

    useEditorStore.setState({
      nodes: nodes.map((n) => ({ ...n, selected: true })),
      edges: [
        { id: "e1", source: nodes[0].id, target: nodes[1].id, sourceHandle: "out:result", targetHandle: "in:prompt" },
      ],
    });

    useEditorStore.getState().duplicateSelected();
    const state = useEditorStore.getState();
    expect(state.nodes).toHaveLength(4);
    expect(state.edges).toHaveLength(2);
    const clonedEdge = state.edges[1];
    expect(clonedEdge.source).not.toBe(nodes[0].id);
    expect(clonedEdge.target).not.toBe(nodes[1].id);
  });

  it("does nothing when no nodes selected", () => {
    useEditorStore.setState({ nodes: [], edges: [] });
    const store = useEditorStore.getState();
    store.addNode("gpt_image_2");
    useEditorStore.getState().duplicateSelected();
    expect(useEditorStore.getState().nodes).toHaveLength(1);
  });
});

describe("duplicateNode / deleteNode / lock / reset", () => {
  it("duplicateNode without edges clones only the node", () => {
    const a = useEditorStore.getState().addNode("gpt_image_2", { x: 0, y: 0 })!;
    const b = useEditorStore.getState().addNode("gpt_image_2", { x: 200, y: 0 })!;
    useEditorStore.getState().onConnect({
      source: a.id,
      target: b.id,
      sourceHandle: "out:result",
      targetHandle: "in:prompt",
    });
    useEditorStore.getState().duplicateNode(a.id, false);
    expect(useEditorStore.getState().nodes).toHaveLength(3);
    expect(useEditorStore.getState().edges).toHaveLength(1);
  });

  it("duplicateNode withEdges remaps incident edges", () => {
    const a = useEditorStore.getState().addNode("gpt_image_2", { x: 0, y: 0 })!;
    const b = useEditorStore.getState().addNode("gpt_image_2", { x: 200, y: 0 })!;
    useEditorStore.getState().onConnect({
      source: a.id,
      target: b.id,
      sourceHandle: "out:result",
      targetHandle: "in:prompt",
    });
    useEditorStore.getState().duplicateNode(a.id, true);
    const { nodes, edges } = useEditorStore.getState();
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
    const clone = nodes.find((n) => n.id !== a.id && n.id !== b.id)!;
    expect(edges.some((e) => e.source === clone.id && e.target === b.id)).toBe(
      true,
    );
  });

  it("deleteNode removes node and incident edges", () => {
    const a = useEditorStore.getState().addNode("gpt_image_2")!;
    const b = useEditorStore.getState().addNode("gpt_image_2")!;
    useEditorStore.getState().onConnect({
      source: a.id,
      target: b.id,
      sourceHandle: "out:result",
      targetHandle: "in:prompt",
    });
    useEditorStore.getState().deleteNode(a.id);
    expect(useEditorStore.getState().nodes).toHaveLength(1);
    expect(useEditorStore.getState().edges).toHaveLength(0);
  });

  it("toggleNodeLock blocks deleteNode", () => {
    const a = useEditorStore.getState().addNode("gpt_image_2")!;
    useEditorStore.getState().toggleNodeLock(a.id);
    const locked = useEditorStore.getState().nodes[0];
    expect(
      (locked.data.config as Record<string, unknown>).locked,
    ).toBe(true);
    expect(locked.draggable).toBe(false);
    useEditorStore.getState().deleteNode(a.id);
    expect(useEditorStore.getState().nodes).toHaveLength(1);
  });

  it("resetNodeInputs restores definition defaults", () => {
    const a = useEditorStore.getState().addNode("gpt_image_2")!;
    useEditorStore.getState().updateNodeData(a.id, "prompt", "x");
    useEditorStore.getState().updateNodeData(a.id, "quality", "Low");
    useEditorStore.getState().resetNodeInputs(a.id);
    const inputs = useEditorStore.getState().nodes[0].data.inputs as Record<
      string,
      unknown
    >;
    expect(inputs.prompt).toBe("");
    expect(inputs.quality).toBe("High");
  });
});
