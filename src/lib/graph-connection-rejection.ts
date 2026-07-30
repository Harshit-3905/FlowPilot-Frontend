import type { Connection, Edge, Node } from "@xyflow/react";
import { makeIsValidConnection } from "@/lib/connection-validator";
import { wouldCreateCycle } from "@/lib/cycle-detection";

/** Client-side codes aligned with docs/09 scenario matrix. */
export type GraphConnectionRejectionCode =
  | "INVALID_CONNECTION"
  | "CYCLE_DETECTED";

export type GraphConnectionRejection = {
  code: GraphConnectionRejectionCode;
  message: string;
};

export const INVALID_CONNECTION_MESSAGE =
  "Invalid connection (INVALID_CONNECTION): incompatible handle types — connection not allowed.";

export const CYCLE_DETECTED_MESSAGE =
  "Cycle detected (CYCLE_DETECTED): this connection would create a loop — only DAGs are allowed.";

/**
 * If the proposed edge is invalid, returns a toast-ready rejection with code.
 * Type mismatch is checked before cycle (mismatch never reaches the graph).
 */
export function describeConnectionRejection(
  nodes: Node[],
  edges: Pick<Edge, "source" | "target">[],
  connection: Connection | Edge,
): GraphConnectionRejection | null {
  const typeOk = makeIsValidConnection(nodes)(connection);
  if (!typeOk) {
    return {
      code: "INVALID_CONNECTION",
      message: INVALID_CONNECTION_MESSAGE,
    };
  }

  if (
    connection.source &&
    connection.target &&
    wouldCreateCycle(edges, connection.source, connection.target)
  ) {
    return {
      code: "CYCLE_DETECTED",
      message: CYCLE_DETECTED_MESSAGE,
    };
  }

  return null;
}
