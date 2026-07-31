import type { Connection, Edge, Node } from "@xyflow/react";
import { getNode } from "@/contracts/node-definition";
import { fieldTypeToDataType, readDynamicFields } from "@/components/nodes/request-node-body";

/**
 * Returns true if sourceType → targetType is a valid data-type connection.
 * "any" on either side always passes.
 */
export function typesCompatible(sourceType: string, targetType: string): boolean {
  if (sourceType === "any" || targetType === "any") return true;
  if (sourceType === targetType) return true;
  // Magica Request text ports wire to string prompts.
  const src = sourceType === "text" ? "string" : sourceType;
  const tgt = targetType === "text" ? "string" : targetType;
  return src === tgt;
}

function resolveHandleDataType(
  node: Node,
  handleId: string,
  side: "source" | "target",
): string | null {
  const def = getNode(node.type ?? "");
  if (!def) return null;

  if (side === "source" && node.type === "request") {
    const field = readDynamicFields(node.data).find((f) => f.id === handleId);
    if (field) return fieldTypeToDataType(field.type);
  }

  const list =
    side === "source" ? def.ui.handles.outputs : def.ui.handles.inputs;
  const handle = list.find((h) => h.id === handleId);
  return handle?.dataType ?? null;
}

/**
 * isValidConnection callback for React Flow.
 * Looks up handle dataTypes from the node registry and validates compatibility.
 */
export function makeIsValidConnection(nodes: Node[]) {
  return (connection: Connection | Edge): boolean => {
    const { source, sourceHandle, target, targetHandle } = connection;
    if (!source || !sourceHandle || !target || !targetHandle) return false;

    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);
    if (!sourceNode || !targetNode) return false;

    const sourceType = resolveHandleDataType(sourceNode, sourceHandle, "source");
    const targetType = resolveHandleDataType(targetNode, targetHandle, "target");
    if (!sourceType || !targetType) return false;

    return typesCompatible(sourceType, targetType);
  };
}
