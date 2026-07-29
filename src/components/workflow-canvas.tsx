"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEditorStore } from "@/store/editor-store";
import { listNodes } from "@/contracts/node-definition";
import { FlowNode } from "@/components/nodes/flow-node";
import { makeIsValidConnection } from "@/lib/connection-validator";
import { wouldCreateCycle } from "@/lib/cycle-detection";
import { colorizeEdge } from "@/lib/edge-style";

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (el as HTMLElement).isContentEditable
  );
}

/** Build nodeTypes map from registry so React Flow renders FlowNode for each registered type. */
function buildNodeTypes(): Record<string, typeof FlowNode> {
  const types: Record<string, typeof FlowNode> = {};
  for (const def of listNodes()) {
    types[def.type] = FlowNode;
  }
  return types;
}

export function WorkflowCanvas() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const onConnect = useEditorStore((s) => s.onConnect);
  const nodeTypes = useMemo(buildNodeTypes, []);

  const viewport = useEditorStore((s) => s.viewport);
  const setViewport = useEditorStore((s) => s.setViewport);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected);

  const coloredEdges = useMemo(
    () => edges.map((e) => colorizeEdge(e, nodes)),
    [edges, nodes],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && !isInputFocused()) {
        deleteSelected();
      }
      if (e.key === "d" && (e.metaKey || e.ctrlKey) && !isInputFocused()) {
        e.preventDefault();
        duplicateSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, duplicateSelected]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
  }, []);

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const validator = makeIsValidConnection(nodes);
      const valid = validator(connection);
      if (!valid) {
        showToast("Incompatible handle types — connection not allowed.");
        return false;
      }
      if (
        connection.source &&
        connection.target &&
        wouldCreateCycle(edges, connection.source, connection.target)
      ) {
        showToast("Connection would create a cycle — only DAGs are allowed.");
        return false;
      }
      return true;
    },
    [nodes, edges, showToast],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) return;
      onConnect(connection);
    },
    [isValidConnection, onConnect],
  );

  return (
    <div data-testid="workflow-canvas" className="relative h-full w-full">
      {toastMsg && (
        <div
          data-testid="connection-error-toast"
          className="pointer-events-none absolute bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
        >
          {toastMsg}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={coloredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        defaultEdgeOptions={{ type: "default", animated: false }}
        defaultViewport={viewport}
        onMoveEnd={(_event, vp) => setViewport(vp)}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#D1D1D6"
          bgColor="var(--bg)"
        />
        <MiniMap data-testid="minimap" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
