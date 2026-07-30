"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEditorStore } from "@/store/editor-store";
import { listNodes } from "@/contracts/node-definition";
import { FlowNode } from "@/components/nodes/flow-node";
import { describeConnectionRejection } from "@/lib/graph-connection-rejection";
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

type WorkflowCanvasProps = {
  onOpenPalette?: () => void;
};

export function WorkflowCanvas({ onOpenPalette }: WorkflowCanvasProps) {
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

  const rfRef = useRef<ReactFlowInstance | null>(null);
  const [minimapOpen, setMinimapOpen] = useState(true);

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

  const [toast, setToast] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((code: string, message: string) => {
    setToast({ code, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  /** Silent for React Flow drag feedback — toast only on connect attempt. */
  const isValidConnection = useCallback(
    (connection: Connection | Edge) =>
      describeConnectionRejection(nodes, edges, connection) === null,
    [nodes, edges],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const rejection = describeConnectionRejection(nodes, edges, connection);
      if (rejection) {
        showToast(rejection.code, rejection.message);
        return;
      }
      onConnect(connection);
    },
    [nodes, edges, onConnect, showToast],
  );

  return (
    <div data-testid="workflow-canvas" className="relative h-full w-full">
      {toast && (
        <div
          data-testid="connection-error-toast"
          data-code={toast.code}
          role="status"
          className="pointer-events-none absolute bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
        >
          {toast.message}
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
        onInit={(instance) => {
          rfRef.current = instance;
        }}
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
        {minimapOpen ? (
          <MiniMap
            data-testid="minimap"
            className="!bottom-16 !right-3 !m-0 overflow-hidden !rounded-[var(--field-radius)] !border !border-[var(--border)] !bg-[var(--panel)] !shadow-[var(--shadow-soft)]"
          />
        ) : null}
      </ReactFlow>
      <CanvasBottomChrome
        onOpenPalette={onOpenPalette}
        onDuplicate={duplicateSelected}
        minimapOpen={minimapOpen}
        onToggleMinimap={() => setMinimapOpen((v) => !v)}
        onZoomIn={() => rfRef.current?.zoomIn()}
        onZoomOut={() => rfRef.current?.zoomOut()}
        onFitView={() => rfRef.current?.fitView({ padding: 0.2 })}
      />
    </div>
  );
}

function CanvasBottomChrome({
  onOpenPalette,
  onDuplicate,
  minimapOpen,
  onToggleMinimap,
  onZoomIn,
  onZoomOut,
  onFitView,
}: {
  onOpenPalette?: () => void;
  onDuplicate: () => void;
  minimapOpen: boolean;
  onToggleMinimap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}) {
  const chip =
    "flex h-8 w-8 items-center justify-center rounded-[var(--field-radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]";

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3">
        <div className="pointer-events-auto absolute bottom-3 left-3">
          <div
            data-testid="canvas-zoom-controls"
            className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1 shadow-[var(--shadow-soft)]"
          >
            <button
              type="button"
              data-testid="canvas-zoom-out"
              aria-label="Zoom out"
              className={chip}
              onClick={onZoomOut}
            >
              −
            </button>
            <button
              type="button"
              data-testid="canvas-zoom-in"
              aria-label="Zoom in"
              className={chip}
              onClick={onZoomIn}
            >
              +
            </button>
            <button
              type="button"
              data-testid="canvas-fit-view"
              aria-label="Fit view"
              className={chip}
              onClick={onFitView}
            >
              <FitIcon />
            </button>
          </div>
        </div>

        <div className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2">
          <div
            data-testid="canvas-center-dock"
            className="flex items-center gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1 shadow-[var(--shadow-soft)]"
          >
            <button
              type="button"
              data-testid="canvas-duplicate"
              aria-label="Duplicate selected"
              className={chip}
              onClick={onDuplicate}
            >
              <DuplicateIcon />
            </button>
            <button
              type="button"
              data-testid="palette-open"
              aria-label="Add node"
              className={chip}
              onClick={() => onOpenPalette?.()}
            >
              <PlusIcon />
            </button>
          </div>
        </div>

        <div className="pointer-events-auto absolute bottom-3 right-3">
          <div
            data-testid="canvas-minimap-toggle-wrap"
            className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1 shadow-[var(--shadow-soft)]"
          >
            <button
              type="button"
              data-testid="canvas-minimap-toggle"
              aria-label={minimapOpen ? "Hide minimap" : "Show minimap"}
              aria-pressed={minimapOpen}
              className={chip}
              onClick={onToggleMinimap}
            >
              <MapIcon />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DuplicateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="5"
        y="5"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 3.5v9M3.5 8h9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 4.5L6 3l4 2 3.5-1.5v9L10 14l-4-2-3.5 1.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M6 3v9M10 5v9"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
