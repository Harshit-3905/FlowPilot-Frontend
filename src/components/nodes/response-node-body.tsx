"use client";

import { type CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  extractAssetUrls,
  isLikelyImageUrl,
} from "@/lib/asset-urls";
import { useEditorStore } from "@/store/editor-store";
import {
  selectLiveNodeOutput,
  useHistoryStore,
} from "@/store/history-store";

const HANDLE_SIZE = 10;

function handleStyle(): CSSProperties {
  return {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: 9999,
    background: "var(--accent-play)",
    border: "2px solid var(--panel)",
    top: "50%",
    transform: "translateY(-50%)",
    left: -5,
  };
}

/** Magica Response empty + filled chrome (upstream type key + preview). */
export function ResponseNodeBody({ nodeId }: { nodeId: string }) {
  const edges = useEditorStore((s) => s.edges);
  const nodes = useEditorStore((s) => s.nodes);
  const liveOutput = useHistoryStore((s) => selectLiveNodeOutput(s, nodeId));

  const upstream = edges
    .filter((e) => e.target === nodeId && e.targetHandle === "result")
    .map((e) => {
      const src = nodes.find((n) => n.id === e.source);
      return src?.type ?? null;
    })
    .find(Boolean);

  const preview = resolveResponsePreview(liveOutput);
  const typeKey = upstream ? upstream.replace(/-/g, "_") : null;
  const hasContent = preview != null;

  return (
    <div
      data-testid={`response-node-body-${nodeId}`}
      className="relative px-3 py-3"
    >
      <div className="relative flex items-start gap-2">
        <Handle
          id="result"
          type="target"
          position={Position.Left}
          style={handleStyle()}
          data-testid="handle-result"
        />
        <span className="mt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
          result
        </span>
      </div>

      {!hasContent ? (
        <div
          data-testid={`response-empty-${nodeId}`}
          className="mt-3 flex min-h-[88px] items-center justify-center px-2 py-6"
        >
          <p className="text-sm text-[var(--text-muted)]">No output added yet</p>
        </div>
      ) : (
        <div
          data-testid={`response-filled-${nodeId}`}
          className="mt-3 rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
        >
          {typeKey ? (
            <p
              data-testid={`response-type-key-${nodeId}`}
              className="text-[11px] font-semibold text-[var(--text)]"
            >
              {typeKey}
            </p>
          ) : null}
          {preview.imageUrl ? (
            <img
              src={preview.imageUrl}
              alt="Response output"
              className="mt-1.5 max-h-28 w-full rounded object-cover"
            />
          ) : null}
          <p
            data-testid={`response-preview-${nodeId}`}
            className="mt-1 text-xs leading-snug text-[var(--text-muted)]"
          >
            {preview.text}
          </p>
        </div>
      )}
    </div>
  );
}

function resolveResponsePreview(liveOutput: unknown): {
  text: string;
  imageUrl?: string;
} | null {
  if (liveOutput == null) return null;

  let value: unknown = liveOutput;
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "result" in value
  ) {
    value = (value as { result: unknown }).result;
  }

  if (value == null) return null;

  const urls = extractAssetUrls(value);
  const imageUrl = urls.find(isLikelyImageUrl);

  if (typeof value === "string") {
    const text = value.length > 90 ? `${value.slice(0, 87)}…` : value;
    return { text, imageUrl };
  }

  try {
    const text = JSON.stringify(value);
    return {
      text: text.length > 90 ? `${text.slice(0, 87)}…` : text,
      imageUrl,
    };
  } catch {
    return { text: String(value), imageUrl };
  }
}
