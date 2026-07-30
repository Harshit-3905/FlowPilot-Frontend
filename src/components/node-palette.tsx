"use client";

import { useEffect, useMemo, useState } from "react";
import { listNodes, type NodeDefinition } from "@/contracts/node-definition";
import inventory from "@/contracts/node-inventory.json";
import { useEditorStore } from "@/store/editor-store";

type InventoryNode = {
  type: string;
  label: string;
  palettePath: string[];
};

type PaletteCategory = {
  id: string;
  subcategories: string[];
};

const categories = inventory.paletteCategories as PaletteCategory[];
const inventoryNodes = inventory.nodes as InventoryNode[];

type NodePaletteProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Magica-style search overlay — "Search nodes or models…" with
 * IMAGE / VIDEO / AUDIO / OTHERS folders (screenshot: canvas_add_node_palette.png).
 */
export function NodePalette({ open, onClose }: NodePaletteProps) {
  const addNode = useEditorStore((s) => s.addNode);
  const definitions = listNodes();
  const [query, setQuery] = useState("");
  const [drill, setDrill] = useState<{
    category: string;
    subcategory: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDrill(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const defByType = useMemo(() => {
    const map = new Map<string, NodeDefinition>();
    for (const d of definitions) map.set(d.type, d);
    return map;
  }, [definitions]);

  const leavesFor = (category: string, subcategory: string) =>
    inventoryNodes.filter(
      (n) =>
        n.palettePath[0] === category &&
        n.palettePath[1] === subcategory &&
        defByType.has(n.type),
    );

  const q = query.trim().toLowerCase();
  const searchHits = useMemo(() => {
    if (!q) return [];
    return inventoryNodes.filter((n) => {
      if (!defByType.has(n.type)) return false;
      const def = defByType.get(n.type)!;
      return (
        def.label.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        n.palettePath.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [q, defByType]);

  if (!open) return null;

  const handleAdd = (type: string) => {
    addNode(type);
    onClose();
  };

  return (
    <div
      data-testid="node-palette-backdrop"
      className="absolute inset-0 z-40 flex items-start justify-center bg-black/20 pt-[12vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        data-testid="node-palette"
        role="dialog"
        aria-label="Add node"
        className="flex max-h-[70vh] w-[min(360px,92vw)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-soft)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
          <SearchIcon />
          <input
            data-testid="palette-search"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDrill(null);
            }}
            placeholder="Search nodes or models..."
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <button
            type="button"
            data-testid="palette-close"
            aria-label="Close palette"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {q ? (
            searchHits.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                No nodes match “{query.trim()}”
              </p>
            ) : (
              <ul>
                {searchHits.map((n) => {
                  const def = defByType.get(n.type)!;
                  return (
                    <li key={n.type}>
                      <LeafButton
                        type={n.type}
                        label={def.label}
                        path={n.palettePath.join(" / ")}
                        onAdd={handleAdd}
                      />
                    </li>
                  );
                })}
              </ul>
            )
          ) : drill ? (
            <div>
              <button
                type="button"
                data-testid="palette-back"
                onClick={() => setDrill(null)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg)]"
              >
                ← {drill.category} / {drill.subcategory}
              </button>
              <ul>
                {leavesFor(drill.category, drill.subcategory).map((n) => {
                  const def = defByType.get(n.type)!;
                  return (
                    <li key={n.type}>
                      <LeafButton
                        type={n.type}
                        label={def.label}
                        onAdd={handleAdd}
                      />
                    </li>
                  );
                })}
                {leavesFor(drill.category, drill.subcategory).length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                    No nodes in this folder yet
                  </p>
                ) : null}
              </ul>
            </div>
          ) : (
            <div className="flex flex-col gap-3 py-2">
              {categories.map((cat) => (
                <section key={cat.id} data-testid={`palette-cat-${cat.id}`}>
                  <h3 className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {cat.id}
                  </h3>
                  <ul>
                    {cat.subcategories.map((sub) => {
                      const count = leavesFor(cat.id, sub).length;
                      return (
                        <li key={sub}>
                          <button
                            type="button"
                            data-testid={`palette-folder-${cat.id}-${sub}`}
                            onClick={() =>
                              setDrill({ category: cat.id, subcategory: sub })
                            }
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--bg)]"
                          >
                            <FolderIcon />
                            <span className="min-w-0 flex-1">{sub}</span>
                            {count > 0 ? (
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {count}
                              </span>
                            ) : null}
                            <ChevronIcon />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeafButton({
  type,
  label,
  path,
  onAdd,
}: {
  type: string;
  label: string;
  path?: string;
  onAdd: (type: string) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`palette-item-${type}`}
      onClick={() => onAdd(type)}
      className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-[var(--bg)]"
    >
      <span className="text-sm text-[var(--text)]">{label}</span>
      {path ? (
        <span className="text-[10px] text-[var(--text-muted)]">{path}</span>
      ) : null}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0 text-[var(--text-muted)]"
    >
      <circle
        cx="7"
        cy="7"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.5 10.5L13.5 13.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="shrink-0 text-[var(--text-muted)]"
    >
      <path
        d="M2 4.5A1.5 1.5 0 0 1 3.5 3H6l1.2 1.5H12.5A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="shrink-0 text-[var(--text-muted)]"
    >
      <path
        d="M4.5 2.5L8 6L4.5 9.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
