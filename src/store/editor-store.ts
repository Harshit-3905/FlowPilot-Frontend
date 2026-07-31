import { create } from "zustand";
import {
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type Viewport,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { getNode } from "@/contracts/node-definition";
import { coloredEdgeFromConnection, colorizeEdge } from "@/lib/edge-style";

export interface WorkflowGraphDTO {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}

export interface EditorState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  setViewport: (vp: Viewport) => void;
  loadGraph: (dto: WorkflowGraphDTO) => void;
  toGraphDTO: () => WorkflowGraphDTO;
  addNode: (
    type: string,
    position?: { x: number; y: number },
  ) => Node | undefined;
  updateNodeData: (nodeId: string, key: string, value: unknown) => void;
  /** Magica Request-Inputs: dual-write `dynamicFields` + `inputs.dynamicFields`. */
  setDynamicFields: (
    nodeId: string,
    fields: Array<{
      id: string;
      name: string;
      type: string;
      value: string;
    }>,
  ) => void;
  setActiveSubModel: (nodeId: string, subModelId: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  /** Clone one node; optionally remapped edges that touched the original. */
  duplicateNode: (nodeId: string, withEdges?: boolean) => void;
  deleteNode: (nodeId: string) => void;
  toggleNodeLock: (nodeId: string) => void;
  resetNodeInputs: (nodeId: string) => void;
}

function buildNodeDefaults(type: string): Record<string, unknown> {
  const def = getNode(type);
  if (!def) return {};
  const defaults: Record<string, unknown> = {};
  for (const field of def.ui.fields) {
    if (field.default !== undefined) {
      defaults[field.key] = field.default;
    }
  }
  return defaults;
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export const useEditorStore = create<EditorState>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: DEFAULT_VIEWPORT,
  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection) => {
    const { nodes, edges } = get();
    const edge = coloredEdgeFromConnection(
      connection,
      nodes,
      `e_${nanoid()}`,
    );
    set({ edges: addEdge(edge, edges) });
  },
  setViewport: (vp) => set({ viewport: vp }),
  loadGraph: (dto) =>
    set({
      nodes: dto.nodes,
      edges: dto.edges.map((e) => colorizeEdge(e, dto.nodes)),
      viewport: dto.viewport,
    }),
  toGraphDTO: () => ({
    nodes: get().nodes,
    edges: get().edges,
    viewport: get().viewport,
  }),
  addNode: (type, position) => {
    const def = getNode(type);
    if (!def) return undefined;
    const node: Node = {
      id: `${type}_${nanoid()}`,
      type,
      position: position ?? { x: 250, y: 150 },
      data: {
        label: def.label,
        inputs:
          type === "request"
            ? { dynamicFields: [] }
            : buildNodeDefaults(type),
        ...(type === "request" ? { dynamicFields: [] } : {}),
        config: {
          activeSubModelId: def.subModels?.[0]?.id ?? null,
        },
        outputs: {},
      },
      width: 380,
    };
    set({ nodes: [...get().nodes, node] });
    return node;
  },
  updateNodeData: (nodeId, key, value) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                inputs: {
                  ...(n.data.inputs as Record<string, unknown>),
                  [key]: value,
                },
              },
            }
          : n,
      ),
    });
  },
  setDynamicFields: (nodeId, fields) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const prevInputs =
          (n.data.inputs as Record<string, unknown> | undefined) ?? {};
        return {
          ...n,
          data: {
            ...n.data,
            dynamicFields: fields,
            inputs: { ...prevInputs, dynamicFields: fields },
          },
        };
      }),
    });
  },
  setActiveSubModel: (nodeId, subModelId) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const prev = (n.data.config as Record<string, unknown> | undefined) ?? {};
        return {
          ...n,
          data: {
            ...n.data,
            config: { ...prev, activeSubModelId: subModelId },
          },
        };
      }),
    });
  },
  deleteSelected: () => {
    const { nodes, edges } = get();
    const selectedNodeIds = new Set(
      nodes.filter((n) => n.selected).map((n) => n.id),
    );
    const selectedEdgeIds = new Set(
      edges.filter((e) => e.selected).map((e) => e.id),
    );
    const remainingNodes = nodes.filter((n) => !selectedNodeIds.has(n.id));
    const remainingEdges = edges.filter(
      (e) =>
        !selectedEdgeIds.has(e.id) &&
        !selectedNodeIds.has(e.source) &&
        !selectedNodeIds.has(e.target),
    );
    set({ nodes: remainingNodes, edges: remainingEdges });
  },
  duplicateSelected: () => {
    const { nodes, edges } = get();
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;

    const idMap = new Map<string, string>();
    const clones: Node[] = selectedNodes.map((n) => {
      const newId = `${n.type}_${nanoid()}`;
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 50, y: n.position.y + 50 },
        selected: false,
        data: structuredClone(n.data),
      };
    });

    const nextNodes = [...nodes, ...clones];
    const clonedEdges: Edge[] = edges
      .filter(
        (e) => idMap.has(e.source) && idMap.has(e.target),
      )
      .map((e) =>
        colorizeEdge(
          {
            ...e,
            id: `e_${nanoid()}`,
            source: idMap.get(e.source)!,
            target: idMap.get(e.target)!,
          },
          nextNodes,
        ),
      );

    set({
      nodes: nextNodes,
      edges: [...edges, ...clonedEdges],
    });
  },
  duplicateNode: (nodeId, withEdges = false) => {
    const { nodes, edges } = get();
    const source = nodes.find((n) => n.id === nodeId);
    if (!source) return;

    const newId = `${source.type}_${nanoid()}`;
    const clone: Node = {
      ...source,
      id: newId,
      position: { x: source.position.x + 50, y: source.position.y + 50 },
      selected: false,
      data: structuredClone(source.data),
    };
    const nextNodes = [...nodes, clone];
    const clonedEdges: Edge[] = withEdges
      ? edges
          .filter((e) => e.source === nodeId || e.target === nodeId)
          .map((e) =>
            colorizeEdge(
              {
                ...e,
                id: `e_${nanoid()}`,
                source: e.source === nodeId ? newId : e.source,
                target: e.target === nodeId ? newId : e.target,
              },
              nextNodes,
            ),
          )
      : [];

    set({
      nodes: nextNodes,
      edges: [...edges, ...clonedEdges],
    });
  },
  deleteNode: (nodeId) => {
    const { nodes, edges } = get();
    const target = nodes.find((n) => n.id === nodeId);
    const locked = Boolean(
      (target?.data?.config as Record<string, unknown> | undefined)?.locked,
    );
    if (locked) return;
    set({
      nodes: nodes.filter((n) => n.id !== nodeId),
      edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
  },
  toggleNodeLock: (nodeId) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const prev =
          (n.data.config as Record<string, unknown> | undefined) ?? {};
        const locked = !Boolean(prev.locked);
        return {
          ...n,
          draggable: !locked,
          deletable: !locked,
          data: {
            ...n.data,
            config: { ...prev, locked },
          },
        };
      }),
    });
  },
  resetNodeInputs: (nodeId) => {
    const { nodes } = get();
    const target = nodes.find((n) => n.id === nodeId);
    if (!target?.type) return;
    const defaults = buildNodeDefaults(target.type);
    set({
      nodes: nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                inputs: { ...defaults },
              },
            }
          : n,
      ),
    });
  },
}));
