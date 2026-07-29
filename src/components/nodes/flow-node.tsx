"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  estimateCredits,
  getNode,
  type HandleDescriptor,
  type UiField,
} from "@/contracts";
import { portCssVarForDataType } from "@/lib/port-colors";
import { useEditorStore } from "@/store/editor-store";

const HANDLE_SIZE = 10;

function handleStyle(dataType: string, side: "left" | "right"): CSSProperties {
  return {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: 9999,
    background: portCssVarForDataType(dataType),
    border: "2px solid var(--panel)",
    top: "50%",
    transform: "translateY(-50%)",
    ...(side === "left" ? { left: -5 } : { right: -5 }),
  };
}

function fieldDefaultValue(field: UiField): string | number {
  if (typeof field.default === "number") return field.default;
  if (typeof field.default === "string") return field.default;
  return "";
}

function FieldControl({
  field,
  value,
  onChange,
  nodeId,
}: {
  field: UiField;
  value: unknown;
  onChange: (key: string, val: unknown) => void;
  nodeId: string;
}) {
  const id = `node-${nodeId}-field-${field.key}`;
  const strVal =
    value !== undefined && value !== null
      ? String(value)
      : String(fieldDefaultValue(field));
  const inputClass =
    "nodrag nopan w-full rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--panel)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--text-muted)]";

  switch (field.control) {
    case "text":
      return (
        <textarea
          id={id}
          data-testid={id}
          rows={3}
          value={strVal}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={`${inputClass} min-h-[72px] resize-y`}
        />
      );
    case "number":
      return (
        <input
          id={id}
          data-testid={id}
          type="number"
          value={strVal}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
          className={inputClass}
        />
      );
    case "slider":
      return (
        <div className="nodrag nopan flex items-center gap-2">
          <input
            id={id}
            data-testid={id}
            type="range"
            min={0}
            max={100}
            value={strVal}
            onChange={(e) => onChange(field.key, Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-[var(--text-muted)]">{strVal}</span>
        </div>
      );
    case "switch":
      return (
        <input
          id={id}
          data-testid={id}
          type="checkbox"
          checked={Boolean(value ?? field.default)}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="nodrag nopan h-4 w-4 accent-[var(--toggle-on)]"
        />
      );
    case "select": {
      const opts = field.options ?? [
        {
          value: String(fieldDefaultValue(field)),
          label: String(fieldDefaultValue(field) || "Select"),
        },
      ];
      return (
        <select
          id={id}
          data-testid={id}
          value={strVal}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClass}
        >
          {opts.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    case "file":
      return (
        <label
          htmlFor={id}
          className="nodrag nopan flex cursor-pointer flex-col items-center justify-center rounded-[var(--field-radius)] border border-dashed border-[var(--upload-dash)] bg-[var(--bg)] px-3 py-4 text-xs text-[var(--text-muted)]"
        >
          <span>Upload {field.label}</span>
          <input id={id} data-testid={id} type="file" className="sr-only" />
        </label>
      );
    default:
      return (
        <input
          id={id}
          data-testid={id}
          type="text"
          value={strVal}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClass}
        />
      );
  }
}

function FieldRow({
  field,
  value,
  onChange,
  nodeId,
  inputHandle,
}: {
  field: UiField;
  value: unknown;
  onChange: (key: string, val: unknown) => void;
  nodeId: string;
  inputHandle?: HandleDescriptor;
}) {
  const labelId = `node-${nodeId}-field-${field.key}`;
  return (
    <div className="relative px-3 py-2" data-testid={`field-row-${field.key}`}>
      {inputHandle ? (
        <Handle
          id={inputHandle.id}
          type="target"
          position={Position.Left}
          style={handleStyle(inputHandle.dataType, "left")}
          data-testid={`handle-${inputHandle.id}`}
        />
      ) : null}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={labelId}
            className="text-xs font-medium text-[var(--text)]"
          >
            {field.label}
            {field.key === "prompt" ? "*" : ""}
          </label>
          {field.control === "switch" ? (
            <FieldControl
              field={field}
              value={value}
              onChange={onChange}
              nodeId={nodeId}
            />
          ) : null}
        </div>
        {field.control !== "switch" ? (
          <FieldControl
            field={field}
            value={value}
            onChange={onChange}
            nodeId={nodeId}
          />
        ) : null}
      </div>
    </div>
  );
}

function creditLabel(type: string, inputs: Record<string, unknown>): string | null {
  try {
    const n = estimateCredits(type, inputs);
    return `~${n.toFixed(2)}M`;
  } catch {
    return null;
  }
}

export function FlowNode({ id, type, data: propData }: NodeProps) {
  const def = getNode(type ?? "");
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const setActiveSubModel = useEditorStore((s) => s.setActiveSubModel);
  const liveData = useEditorStore(
    (s) => s.nodes.find((n) => n.id === id)?.data,
  );
  const data = (liveData ?? propData) as Record<string, unknown>;
  const [settingsOpen, setSettingsOpen] = useState(false);

  const label = data?.label ?? def?.label ?? type;
  const inputs = (data?.inputs ?? {}) as Record<string, unknown>;
  const config = (data?.config ?? {}) as Record<string, unknown>;
  const activeSubModelId =
    (config.activeSubModelId as string | null | undefined) ??
    def?.subModels?.[0]?.id ??
    null;

  if (!def) {
    return (
      <div
        data-testid={`flow-node-${id}`}
        className="rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm"
        style={{ width: 380 }}
      >
        <span className="text-xs text-[var(--danger)]">Unknown: {type}</span>
      </div>
    );
  }

  const primaryFields = def.ui.fields.filter((f) => !f.advanced);
  const advancedFields = def.ui.fields.filter((f) => Boolean(f.advanced));
  const inputByKey = new Map(
    def.ui.handles.inputs.map((h) => [h.id.replace(/^in:/, ""), h]),
  );
  const outputs = def.ui.handles.outputs;
  const credits = creditLabel(def.type, inputs);
  const outputLabel = outputs[0]?.label ?? "Output";

  const onChange = (key: string, value: unknown) => {
    updateNodeData(id, key, value);
  };

  const body: ReactNode = (
    <>
      {def.subModels && def.subModels.length > 0 ? (
        <div
          data-testid={`flow-node-submodels-${id}`}
          className="nodrag nopan flex gap-1 px-3 py-2"
        >
          {def.subModels.map((sm) => {
            const active = sm.id === activeSubModelId;
            return (
              <button
                key={sm.id}
                type="button"
                data-testid={`submodel-${sm.id}`}
                onClick={() => setActiveSubModel(id, sm.id)}
                className={
                  active
                    ? "rounded-md bg-[var(--mode-active)] px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-md bg-[var(--bg)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]"
                }
              >
                {sm.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-col">
        {primaryFields.map((field) => (
          <FieldRow
            key={field.key}
            field={field}
            value={inputs[field.key]}
            onChange={onChange}
            nodeId={id}
            inputHandle={inputByKey.get(field.key)}
          />
        ))}
      </div>

      {advancedFields.length > 0 ? (
        <div className="border-t border-[var(--border)]">
          <div className="relative">
            {!settingsOpen
              ? advancedFields.map((field, i) => {
                  const h = inputByKey.get(field.key);
                  if (!h) return null;
                  return (
                    <Handle
                      key={h.id}
                      id={h.id}
                      type="target"
                      position={Position.Left}
                      style={{
                        ...handleStyle(h.dataType, "left"),
                        top: 10 + i * 12,
                        transform: "none",
                      }}
                      data-testid={`handle-${h.id}`}
                    />
                  );
                })
              : null}
            <button
              type="button"
              data-testid={`flow-node-settings-toggle-${id}`}
              className="nodrag nopan flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text)]"
              onClick={() => setSettingsOpen((o) => !o)}
            >
              <span>Settings</span>
              <span className="text-[var(--text-muted)]">
                {settingsOpen ? "▾" : "▸"}
              </span>
            </button>
          </div>
          {settingsOpen ? (
            <div data-testid={`flow-node-settings-${id}`}>
              {advancedFields.map((field) => (
                <FieldRow
                  key={field.key}
                  field={field}
                  value={inputs[field.key]}
                  onChange={onChange}
                  nodeId={id}
                  inputHandle={inputByKey.get(field.key)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative border-t border-[var(--border)] px-3 py-3">
        {outputs.map((h) => (
          <Handle
            key={h.id}
            id={h.id}
            type="source"
            position={Position.Right}
            style={handleStyle(h.dataType, "right")}
            data-testid={`handle-${h.id}`}
          />
        ))}
        <p className="text-xs font-medium text-[var(--text)]">{outputLabel}</p>
        <p
          data-testid={`flow-node-no-output-${id}`}
          className="mt-1 text-xs text-[var(--text-muted)]"
        >
          No output yet
        </p>
        {credits ? (
          <p
            data-testid={`flow-node-credits-${id}`}
            className="mt-2 text-right text-[10px] text-[var(--text-muted)]"
          >
            {credits}
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      data-testid={`flow-node-${id}`}
      className="rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)] shadow-sm"
      style={{ width: "var(--node-width)" }}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <span className="flex-1 truncate text-sm font-semibold text-[var(--text)]">
          {label as string}
        </span>
        <button
          type="button"
          data-testid={`flow-node-run-${id}`}
          disabled
          className="nodrag nopan rounded-md bg-[var(--accent-run-node)] px-2.5 py-1 text-xs font-semibold text-[var(--text)] opacity-90 disabled:cursor-not-allowed"
        >
          Run
        </button>
        <button
          type="button"
          data-testid={`flow-node-menu-${id}`}
          className="nodrag nopan px-1 text-sm text-[var(--text-muted)]"
          aria-label="Node menu"
        >
          ⋮
        </button>
      </div>
      {body}
    </div>
  );
}
