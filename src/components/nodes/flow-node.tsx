"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  estimateCredits,
  getNode,
  isUiFieldVisibleForSubModel,
  type HandleDescriptor,
  type UiField,
} from "@/contracts";
import { useWorkflowRun } from "@/components/workflow-run-context";
import { AssetLinks } from "@/components/asset-links";
import {
  RequestAddFieldButton,
  RequestNodeBody,
  readDynamicFields,
} from "@/components/nodes/request-node-body";
import { ResponseNodeBody } from "@/components/nodes/response-node-body";
import { canvasNodeStatusChrome } from "@/lib/canvas-node-status";
import {
  extractAssetUrls,
  isLikelyImageUrl,
} from "@/lib/asset-urls";
import { portCssVarForDataType } from "@/lib/port-colors";
import { useEditorStore } from "@/store/editor-store";
import {
  selectLiveNodeOutput,
  selectLiveNodeStatus,
  useHistoryStore,
} from "@/store/history-store";

const HANDLE_SIZE = 10;
const REQUIRED_FIELD_KEYS = new Set(["prompt", "videos", "image_url"]);

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

function fieldLabelText(field: UiField): string {
  const star = REQUIRED_FIELD_KEYS.has(field.key) ? "*" : "";
  return `${field.label}${star}`;
}

function uploadZoneCopy(field: UiField, dataType?: string): string {
  const hay = `${field.label} ${dataType ?? ""}`.toLowerCase();
  if (hay.includes("video")) return "Upload Video";
  return "Upload Image";
}

function IconInfo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconReset({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconCredits({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10.5c.5-1 1.5-1.5 2.5-1.5s2 .5 2.5 1.5M9.5 13.5c.5 1 1.5 1.5 2.5 1.5s2-.5 2.5-1.5" />
    </svg>
  );
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M12 16V7M8 10l4-4 4 4M5 19h14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResponseIcon() {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--accent-play)] text-white"
      aria-hidden
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M9 5H5v14h14v-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 3h6v6M21 3l-9 9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  nodeId,
  dataType,
}: {
  field: UiField;
  value: unknown;
  onChange: (key: string, val: unknown) => void;
  nodeId: string;
  dataType?: string;
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
          placeholder={
            field.key === "prompt"
              ? "Describe…"
              : field.key === "system_prompt"
                ? "You are a helpful assistant…"
                : undefined
          }
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
    case "switch": {
      const on = Boolean(value ?? field.default);
      return (
        <div
          role="switch"
          aria-checked={on}
          data-testid={id}
          className="nodrag nopan inline-flex overflow-hidden rounded-md border border-[var(--border)] text-[11px] font-medium"
        >
          <button
            type="button"
            className={
              !on
                ? "bg-[var(--bg)] px-2.5 py-1 text-[var(--text)]"
                : "bg-[var(--panel)] px-2.5 py-1 text-[var(--text-muted)]"
            }
            onClick={() => onChange(field.key, false)}
          >
            False
          </button>
          <button
            type="button"
            className={
              on
                ? "bg-[var(--toggle-on)] px-2.5 py-1 text-white"
                : "bg-[var(--panel)] px-2.5 py-1 text-[var(--text-muted)]"
            }
            onClick={() => onChange(field.key, true)}
          >
            True
          </button>
        </div>
      );
    }
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
          className="nodrag nopan flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--field-radius)] border border-dashed border-[var(--upload-dash)] bg-[var(--bg)] px-3 py-5 text-xs text-[var(--text-muted)]"
        >
          <IconUpload className="text-[var(--text-muted)]" />
          <span>{uploadZoneCopy(field, dataType)}</span>
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
  const showPlus = field.control !== "switch";
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
            className="text-xs font-medium text-[var(--text-muted)]"
          >
            {fieldLabelText(field)}
          </label>
          {field.control === "switch" ? (
            <FieldControl
              field={field}
              value={value}
              onChange={onChange}
              nodeId={nodeId}
              dataType={inputHandle?.dataType}
            />
          ) : showPlus ? (
            <button
              type="button"
              data-testid={`field-add-${field.key}`}
              className="nodrag nopan flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-xs text-[var(--text-muted)]"
              aria-label={`Add ${field.label}`}
            >
              +
            </button>
          ) : null}
        </div>
        {field.control !== "switch" ? (
          <div className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1">
              <FieldControl
                field={field}
                value={value}
                onChange={onChange}
                nodeId={nodeId}
                dataType={inputHandle?.dataType}
              />
            </div>
          </div>
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

function formatNodeOutputSummary(value: unknown): string {
  if (value == null) return "—";
  try {
    const text = JSON.stringify(value);
    if (text.length <= 160) return text;
    return `${text.slice(0, 157)}…`;
  } catch {
    return String(value);
  }
}

function NodeOverflowMenu({
  nodeId,
  locked,
  onClose,
}: {
  nodeId: string;
  locked: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const toggleNodeLock = useEditorStore((s) => s.toggleNodeLock);

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

  const itemClass =
    "nodrag nopan flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--bg)]";

  return (
    <div
      ref={ref}
      role="menu"
      data-testid={`flow-node-menu-panel-${nodeId}`}
      className="absolute right-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--panel)] py-1 shadow-[var(--shadow-soft)]"
    >
      <button
        type="button"
        role="menuitem"
        data-testid={`flow-node-menu-duplicate-${nodeId}`}
        className={itemClass}
        onClick={() => {
          duplicateNode(nodeId, false);
          onClose();
        }}
      >
        Duplicate
      </button>
      <button
        type="button"
        role="menuitem"
        data-testid={`flow-node-menu-duplicate-edges-${nodeId}`}
        className={itemClass}
        onClick={() => {
          duplicateNode(nodeId, true);
          onClose();
        }}
      >
        Duplicate with Edges
      </button>
      <button
        type="button"
        role="menuitem"
        data-testid={`flow-node-menu-lock-${nodeId}`}
        className={itemClass}
        onClick={() => {
          toggleNodeLock(nodeId);
          onClose();
        }}
      >
        {locked ? "Unlock" : "Lock"}
      </button>
      <button
        type="button"
        role="menuitem"
        data-testid={`flow-node-menu-delete-${nodeId}`}
        className={`${itemClass} text-[var(--danger)]`}
        disabled={locked}
        onClick={() => {
          deleteNode(nodeId);
          onClose();
        }}
      >
        Delete
      </button>
    </div>
  );
}

export function FlowNode({ id, type, data: propData }: NodeProps) {
  const def = getNode(type ?? "");
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const setActiveSubModel = useEditorStore((s) => s.setActiveSubModel);
  const resetNodeInputs = useEditorStore((s) => s.resetNodeInputs);
  const runCtx = useWorkflowRun();
  const liveData = useEditorStore(
    (s) => s.nodes.find((n) => n.id === id)?.data,
  );
  const data = (liveData ?? propData) as Record<string, unknown>;
  const canvasStatus = useHistoryStore((s) => selectLiveNodeStatus(s, id));
  const liveOutput = useHistoryStore((s) => selectLiveNodeOutput(s, id));
  const statusChrome = canvasNodeStatusChrome(canvasStatus);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const label = data?.label ?? def?.label ?? type;
  const inputs = (data?.inputs ?? {}) as Record<string, unknown>;
  const config = (data?.config ?? {}) as Record<string, unknown>;
  const locked = Boolean(config.locked);
  const activeSubModelId =
    (config.activeSubModelId as string | null | undefined) ??
    def?.subModels?.[0]?.id ??
    null;

  if (!def) {
    return (
      <div
        data-testid={`flow-node-${id}`}
        className="flow-node-card rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)] p-3"
        style={{ width: "var(--node-width)" }}
      >
        <span className="text-xs text-[var(--danger)]">Unknown: {type}</span>
      </div>
    );
  }

  if (type === "request") {
    const fields = readDynamicFields(data);
    return (
      <div
        data-testid={`flow-node-${id}`}
        data-status={statusChrome.dataStatus}
        className={`flow-node-card rounded-[var(--node-radius)] border bg-[var(--panel)] ${statusChrome.rootClassName}`}
        style={{ width: "var(--node-width)" }}
      >
        <div
          className={`relative flex items-center gap-1 border-b px-3 py-2 ${statusChrome.headerClassName}`}
        >
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text)]">
            {label as string}
          </span>
          <button
            type="button"
            data-testid={`flow-node-info-${id}`}
            className="nodrag nopan rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg)]"
            aria-label="Node info"
            title={def.label}
          >
            <IconInfo />
          </button>
          <RequestAddFieldButton nodeId={id} fields={fields} />
        </div>
        <RequestNodeBody nodeId={id} data={data} />
      </div>
    );
  }

  if (type === "response") {
    return (
      <div
        data-testid={`flow-node-${id}`}
        data-status={statusChrome.dataStatus}
        className={`flow-node-card rounded-[var(--node-radius)] border bg-[var(--panel)] ${statusChrome.rootClassName}`}
        style={{ width: "var(--node-width)" }}
      >
        <div
          className={`relative flex items-center gap-1 border-b px-3 py-2 ${statusChrome.headerClassName}`}
        >
          <ResponseIcon />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text)]">
            {label as string}
          </span>
          <button
            type="button"
            data-testid={`flow-node-info-${id}`}
            className="nodrag nopan rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg)]"
            aria-label="Node info"
            title={def.label}
          >
            <IconInfo />
          </button>
        </div>
        <ResponseNodeBody nodeId={id} />
      </div>
    );
  }

  const primaryFields = def.ui.fields.filter(
    (f) =>
      !f.advanced && isUiFieldVisibleForSubModel(f, activeSubModelId),
  );
  const advancedFields = def.ui.fields.filter(
    (f) =>
      Boolean(f.advanced) &&
      isUiFieldVisibleForSubModel(f, activeSubModelId),
  );
  const inputByKey = new Map(
    def.ui.handles.inputs.map((h) => [h.id.replace(/^in:/, ""), h]),
  );
  const outputs = def.ui.handles.outputs;
  const credits = creditLabel(def.type, inputs);
  const outputLabel = outputs[0]?.label ?? "Output";
  const assetUrls =
    liveOutput !== undefined ? extractAssetUrls(liveOutput) : [];
  const previewImage = assetUrls.find(isLikelyImageUrl);

  const onChange = (key: string, value: unknown) => {
    updateNodeData(id, key, value);
  };

  const body: ReactNode = (
    <>
      {def.subModels && def.subModels.length > 0 ? (
        <div
          data-testid={`flow-node-submodels-${id}`}
          className="nodrag nopan mx-3 my-2 flex gap-0.5 rounded-lg bg-[var(--bg)] p-0.5"
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
                    ? "flex-1 rounded-md bg-[var(--mode-active)] px-2.5 py-1.5 text-xs font-medium text-white"
                    : "flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)]"
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
              className="nodrag nopan flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--text)]"
              onClick={() => setSettingsOpen((o) => !o)}
            >
              <span className="text-[var(--text-muted)]" aria-hidden>
                {settingsOpen ? "▾" : "›"}
              </span>
              <span>Settings</span>
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
        <p className="text-xs font-medium text-[var(--text-muted)]">
          {outputLabel}
        </p>
        {liveOutput !== undefined ? (
          <div
            data-testid={`flow-node-output-${id}`}
            className="mt-1 space-y-1 rounded-[var(--field-radius)] border border-[var(--border)] p-2"
          >
            {previewImage ? (
              <img
                src={previewImage}
                alt="Node output"
                data-testid={`flow-node-output-preview-${id}`}
                className="max-h-24 w-full rounded object-cover"
              />
            ) : null}
            <pre className="max-h-14 overflow-auto rounded bg-[var(--bg)] px-1.5 py-1 font-mono text-[10px] leading-snug text-[var(--text)]">
              {formatNodeOutputSummary(liveOutput)}
            </pre>
            <AssetLinks
              urls={assetUrls}
              testIdPrefix={`flow-node-output-${id}`}
            />
          </div>
        ) : (
          <div
            data-testid={`flow-node-no-output-${id}`}
            className="mt-1 flex min-h-[80px] items-center justify-center rounded-[var(--field-radius)] border border-[var(--border)] px-2 py-4"
          >
            <p className="text-xs text-[var(--text-muted)]">No output yet</p>
          </div>
        )}
        {credits ? (
          <div
            data-testid={`flow-node-credits-${id}`}
            className="mt-2 flex items-center justify-end gap-1 text-[10px] text-[var(--text-muted)]"
          >
            <IconCredits />
            <span>{credits}</span>
            <IconInfo className="opacity-70" />
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      data-testid={`flow-node-${id}`}
      data-status={statusChrome.dataStatus}
      className={`flow-node-card rounded-[var(--node-radius)] border bg-[var(--panel)] ${statusChrome.rootClassName}`}
      style={{ width: "var(--node-width)" }}
    >
      <div
        className={`relative flex items-center gap-1 border-b px-3 py-2 ${statusChrome.headerClassName}`}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text)]">
          {label as string}
        </span>
        {statusChrome.showBadge ? (
          <span
            data-testid={`flow-node-status-badge-${id}`}
            data-status={statusChrome.dataStatus}
            className={statusChrome.badgeClassName}
          >
            {statusChrome.dataStatus}
          </span>
        ) : null}
        <button
          type="button"
          data-testid={`flow-node-info-${id}`}
          className="nodrag nopan rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg)]"
          aria-label="Node info"
          title={def.label}
        >
          <IconInfo />
        </button>
        <button
          type="button"
          data-testid={`flow-node-reset-${id}`}
          className="nodrag nopan rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg)]"
          aria-label="Reset inputs"
          onClick={() => resetNodeInputs(id)}
        >
          <IconReset />
        </button>
        <button
          type="button"
          data-testid={`flow-node-run-${id}`}
          disabled={!runCtx || runCtx.isBusy}
          onClick={() => void runCtx?.runNode(id)}
          className="nodrag nopan inline-flex items-center gap-1 rounded-md bg-[var(--accent-run-node)] px-2.5 py-1 text-xs font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconPlay />
          Run
        </button>
        <div className="relative">
          <button
            type="button"
            data-testid={`flow-node-menu-${id}`}
            className="nodrag nopan flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-sm text-[var(--text-muted)] hover:bg-[var(--bg)]"
            aria-label="Node menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            ⋯
          </button>
          {menuOpen ? (
            <NodeOverflowMenu
              nodeId={id}
              locked={locked}
              onClose={() => setMenuOpen(false)}
            />
          ) : null}
        </div>
      </div>
      {body}
    </div>
  );
}
