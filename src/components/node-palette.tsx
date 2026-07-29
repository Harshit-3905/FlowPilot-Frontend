"use client";

import { listNodes } from "@/contracts/node-definition";
import { useEditorStore } from "@/store/editor-store";

export function NodePalette() {
  const addNode = useEditorStore((s) => s.addNode);
  const definitions = listNodes();

  return (
    <aside
      data-testid="node-palette"
      className="flex w-40 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-[var(--border)] bg-[var(--panel)] px-2 py-3"
    >
      <h2 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Nodes
      </h2>
      {definitions.map((def) => (
        <button
          key={def.type}
          data-testid={`palette-item-${def.type}`}
          className="rounded-md px-2 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--bg)]"
          onClick={() => addNode(def.type)}
        >
          {def.label}
        </button>
      ))}
    </aside>
  );
}
