"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";
import { nanoid } from "nanoid";
import type { RequestDynamicField } from "@/contracts";
import { portCssVarForDataType } from "@/lib/port-colors";
import { useEditorStore } from "@/store/editor-store";

const HANDLE_SIZE = 10;

export const REQUEST_FIELD_TYPES = [
  { type: "text", label: "Text", dataType: "text", icon: "text" },
  { type: "number", label: "Number", dataType: "number", icon: "number" },
  { type: "boolean", label: "Boolean", dataType: "boolean", icon: "boolean" },
  { type: "image", label: "Image", dataType: "image", icon: "image" },
  { type: "audio", label: "Audio", dataType: "audio", icon: "audio" },
  { type: "video", label: "Video", dataType: "video", icon: "video" },
  { type: "media", label: "Media", dataType: "any", icon: "media" },
  { type: "file", label: "File", dataType: "any", icon: "file" },
] as const;

export type RequestFieldType = (typeof REQUEST_FIELD_TYPES)[number]["type"];

export function readDynamicFields(data: unknown): RequestDynamicField[] {
  if (!data || typeof data !== "object") return [];
  const raw = (data as { dynamicFields?: unknown }).dynamicFields;
  if (!Array.isArray(raw)) return [];
  const out: RequestDynamicField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    const id = typeof f.id === "string" ? f.id : "";
    const name = typeof f.name === "string" ? f.name : "";
    if (!id || !name) continue;
    out.push({
      id,
      name,
      type: typeof f.type === "string" ? f.type : "text",
      value: typeof f.value === "string" ? f.value : "",
    });
  }
  return out;
}

export function fieldTypeToDataType(type: string): string {
  const found = REQUEST_FIELD_TYPES.find((t) => t.type === type);
  return found?.dataType ?? "text";
}

function handleStyle(dataType: string): CSSProperties {
  return {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: 9999,
    background: portCssVarForDataType(dataType),
    border: "2px solid var(--panel)",
    top: "50%",
    transform: "translateY(-50%)",
    right: -5,
  };
}

function defaultFieldName(type: RequestFieldType): string {
  return `${type}_field`;
}

export function RequestAddFieldButton({
  nodeId,
  fields,
}: {
  nodeId: string;
  fields: RequestDynamicField[];
}) {
  const setDynamicFields = useEditorStore((s) => s.setDynamicFields);
  const [menuOpen, setMenuOpen] = useState(false);

  const addField = (type: RequestFieldType) => {
    const id = `field_${Date.now()}_${nanoid(9)}`;
    setDynamicFields(nodeId, [
      ...fields,
      { id, name: defaultFieldName(type), type, value: "" },
    ]);
    setMenuOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        data-testid={`request-add-field-${nodeId}`}
        aria-label="Add input field"
        aria-expanded={menuOpen}
        className="nodrag nopan flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <PlusIcon />
      </button>
      {menuOpen ? (
        <FieldTypeMenu
          nodeId={nodeId}
          onSelect={addField}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
    </div>
  );
}

export function RequestNodeBody({
  nodeId,
  data,
}: {
  nodeId: string;
  data: unknown;
}) {
  const setDynamicFields = useEditorStore((s) => s.setDynamicFields);
  const fields = readDynamicFields(data);

  const setFields = (next: RequestDynamicField[]) => {
    setDynamicFields(nodeId, next);
  };

  const updateField = (id: string, patch: Partial<RequestDynamicField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const copyField = (id: string) => {
    const src = fields.find((f) => f.id === id);
    if (!src) return;
    const newId = `field_${Date.now()}_${nanoid(9)}`;
    setFields([...fields, { ...src, id: newId, name: `${src.name}_copy` }]);
  };

  if (fields.length === 0) {
    return (
      <div
        data-testid={`request-node-body-${nodeId}`}
        className="px-4 py-8 text-center"
      >
        <p
          data-testid={`request-empty-${nodeId}`}
          className="text-sm text-[var(--text-muted)]"
        >
          No fields added yet. Click the + icon to add input fields…
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid={`request-node-body-${nodeId}`}
      className="flex flex-col gap-2 px-3 py-3"
    >
      {fields.map((field) => (
        <RequestFieldRow
          key={field.id}
          field={field}
          onChange={(patch) => updateField(field.id, patch)}
          onCopy={() => copyField(field.id)}
          onDelete={() => removeField(field.id)}
        />
      ))}
    </div>
  );
}

function RequestFieldRow({
  field,
  onChange,
  onCopy,
  onDelete,
}: {
  field: RequestDynamicField;
  onChange: (patch: Partial<RequestDynamicField>) => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const dataType = fieldTypeToDataType(field.type);
  const uploadLabel =
    field.type === "file"
      ? "File"
      : field.type.charAt(0).toUpperCase() + field.type.slice(1);
  return (
    <div
      data-testid={`request-field-${field.id}`}
      className="relative rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--panel)]"
    >
      <Handle
        id={field.id}
        type="source"
        position={Position.Right}
        style={handleStyle(dataType)}
        data-testid={`handle-${field.id}`}
      />
      <div className="flex items-center gap-1.5 px-2.5 pt-2">
        <GripIcon />
        <input
          data-testid={`request-field-name-${field.id}`}
          value={field.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="nodrag nopan min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[var(--text)] outline-none"
        />
        <IconInfo />
        <button
          type="button"
          data-testid={`request-field-copy-${field.id}`}
          aria-label="Copy field"
          className="nodrag nopan rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg)]"
          onClick={onCopy}
        >
          <CopyIcon />
        </button>
        <button
          type="button"
          data-testid={`request-field-delete-${field.id}`}
          aria-label="Delete field"
          className="nodrag nopan rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--danger)]"
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      </div>
      <div className="px-2.5 pb-2.5 pt-1.5">
        {field.type === "boolean" ? (
          <label className="nodrag nopan flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              data-testid={`request-field-value-${field.id}`}
              checked={field.value === "true"}
              onChange={(e) =>
                onChange({ value: e.target.checked ? "true" : "false" })
              }
            />
            {field.value === "true" ? "True" : "False"}
          </label>
        ) : field.type === "image" ||
          field.type === "audio" ||
          field.type === "video" ||
          field.type === "media" ||
          field.type === "file" ? (
          <button
            type="button"
            data-testid={`request-field-value-${field.id}`}
            className="nodrag nopan flex w-full items-center justify-center gap-2 rounded-[var(--field-radius)] border border-dashed border-[var(--upload-dash)] bg-[var(--bg)] px-3 py-4 text-sm text-[var(--text-muted)]"
          >
            Upload {uploadLabel}
          </button>
        ) : (
          <textarea
            data-testid={`request-field-value-${field.id}`}
            rows={3}
            value={field.value}
            onChange={(e) => onChange({ value: e.target.value })}
            className="nodrag nopan min-h-[72px] w-full resize-y rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[color-mix(in_srgb,var(--accent-play)_50%,var(--border))]"
          />
        )}
      </div>
    </div>
  );
}

function FieldTypeMenu({
  nodeId,
  onSelect,
  onClose,
}: {
  nodeId: string;
  onSelect: (type: RequestFieldType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      data-testid={`request-field-type-menu-${nodeId}`}
      className="absolute right-0 top-full z-30 mt-1 min-w-[160px] overflow-hidden rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--panel)] py-1 shadow-[var(--shadow-soft)]"
    >
      {REQUEST_FIELD_TYPES.map((t) => (
        <button
          key={t.type}
          type="button"
          role="menuitem"
          data-testid={`request-field-type-${t.type}`}
          className="nodrag nopan flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--bg)]"
          onClick={() => onSelect(t.type)}
        >
          <TypeIcon kind={t.icon} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function TypeIcon({ kind }: { kind: string }) {
  const cls = "shrink-0 text-[var(--text-muted)]";
  switch (kind) {
    case "text":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3 4h8M5 4v6M9 4v6M4 10h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case "number":
      return <span className={`${cls} w-3.5 text-center text-[11px] font-semibold`}>#</span>;
    case "boolean":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3 7.5l2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "image":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <rect x="2" y="3" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="5" cy="6" r="1" fill="currentColor" />
          <path d="M2 9.5l3-2.5 2 1.5 2.5-3L12 9" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    case "audio":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M5 5v4l3.5 2V3L5 5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M10 5.5a2.5 2.5 0 010 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "video":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <rect x="1.5" y="3.5" width="8" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M9.5 6l3-1.5v5L9.5 8V6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    case "media":
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3 9V5l2.5 1.5V3.5L9 5v4L5.5 7.5V10.5L3 9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M10 5.5a2 2 0 010 3M11.5 4.5a3.5 3.5 0 010 5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      );
    case "file":
    default:
      return (
        <svg className={cls} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M4 2.5h4l3 3V11.5a1 1 0 01-1 1H4a1 1 0 01-1-1v-8a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M8 2.5V5.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      );
  }
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden className="text-[var(--text-muted)]">
      <circle cx="3" cy="3" r="1" fill="currentColor" />
      <circle cx="7" cy="3" r="1" fill="currentColor" />
      <circle cx="3" cy="7" r="1" fill="currentColor" />
      <circle cx="7" cy="7" r="1" fill="currentColor" />
      <circle cx="3" cy="11" r="1" fill="currentColor" />
      <circle cx="7" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)] opacity-70" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
