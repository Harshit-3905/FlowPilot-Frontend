import { getNode } from "./node-definition";

/**
 * Resolve credit estimate for a registered node type + input.
 * Uses `credits.static` or `credits.estimate(input)` from the definition.
 *
 * @throws if type is unknown or the node has no credits metadata
 */
export function estimateCredits(type: string, input: unknown): number {
  const node = getNode(type);
  if (!node) {
    throw new Error(`Unknown node type: ${type}`);
  }
  const { credits } = node;
  if (!credits) {
    throw new Error(`Node type "${type}" has no credits metadata`);
  }
  if ("static" in credits) {
    return credits.static;
  }
  return credits.estimate(input);
}
