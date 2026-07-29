import type { Connection, Edge, Node } from "@xyflow/react";
import { getNode } from "@/contracts/node-definition";

/**
 * Returns true if sourceType → targetType is a valid data-type connection.
 * "any" on either side always passes.
 */
export function typesCompatible(sourceType: string, targetType: string): boolean {
  if (sourceType === "any" || targetType === "any") return true;
  return sourceType === targetType;
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

    const sourceDef = getNode(sourceNode.type ?? "");
    const targetDef = getNode(targetNode.type ?? "");
    if (!sourceDef || !targetDef) return false;

    const sourceHandle_ = sourceDef.ui.handles.outputs.find(
      (h) => h.id === sourceHandle,
    );
    const targetHandle_ = targetDef.ui.handles.inputs.find(
      (h) => h.id === targetHandle,
    );
    if (!sourceHandle_ || !targetHandle_) return false;

    return typesCompatible(sourceHandle_.dataType, targetHandle_.dataType);
  };
}
