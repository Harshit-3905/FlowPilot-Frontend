import type { Edge } from "@xyflow/react";

/**
 * Returns true if adding an edge from `source` → `target` would create a cycle.
 * Uses BFS from `target` through existing edges to check if `source` is reachable.
 */
export function wouldCreateCycle(
  edges: Pick<Edge, "source" | "target">[],
  source: string,
  target: string,
): boolean {
  if (source === target) return true;

  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.source) ?? [];
    list.push(e.target);
    adj.set(e.source, list);
  }

  const visited = new Set<string>();
  const queue = [target];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of adj.get(current) ?? []) {
      queue.push(neighbor);
    }
  }

  return false;
}
