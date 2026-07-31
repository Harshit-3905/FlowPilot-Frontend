import type { Connection, Edge, Node } from "@xyflow/react";
import { getNode } from "@/contracts/node-definition";
import {
  fieldTypeToDataType,
  readDynamicFields,
} from "@/components/nodes/request-node-body";
import { portColorForDataType } from "@/lib/port-colors";

/** Look up source handle dataType for a connection / edge. */
export function sourceHandleDataType(
  nodes: Node[],
  sourceId: string | null | undefined,
  sourceHandleId: string | null | undefined,
): string {
  if (!sourceId || !sourceHandleId) return "any";
  const node = nodes.find((n) => n.id === sourceId);
  if (!node?.type) return "any";
  if (node.type === "request") {
    const field = readDynamicFields(node.data).find(
      (f) => f.id === sourceHandleId,
    );
    if (field) return fieldTypeToDataType(field.type);
  }
  const def = getNode(node.type);
  const handle = def?.ui.handles.outputs.find((h) => h.id === sourceHandleId);
  return handle?.dataType ?? "any";
}

/** Stroke style for a Bézier edge colored by source handle dataType. */
export function edgeStyleForDataType(dataType: string): {
  stroke: string;
  strokeWidth: number;
} {
  return {
    stroke: portColorForDataType(dataType),
    strokeWidth: 2,
  };
}

/** Build a new edge with Magica-colored stroke from a connection. */
export function coloredEdgeFromConnection(
  connection: Connection,
  nodes: Node[],
  id: string,
): Edge {
  const dataType = sourceHandleDataType(
    nodes,
    connection.source,
    connection.sourceHandle,
  );
  return {
    id,
    source: connection.source!,
    target: connection.target!,
    sourceHandle: connection.sourceHandle ?? undefined,
    targetHandle: connection.targetHandle ?? undefined,
    type: "default",
    style: edgeStyleForDataType(dataType),
  };
}

/** Ensure persisted edges carry stroke color (load / duplicate paths). */
export function colorizeEdge(edge: Edge, nodes: Node[]): Edge {
  if (edge.style?.stroke) return edge;
  const dataType = sourceHandleDataType(nodes, edge.source, edge.sourceHandle);
  return {
    ...edge,
    type: edge.type ?? "default",
    style: { ...edge.style, ...edgeStyleForDataType(dataType) },
  };
}
