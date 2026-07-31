"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RunHistoryListResponseSchema,
  type RunHistoryEntry,
  type RunStatus,
} from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { formatDisplayM } from "@/lib/format-credits";
import { useEditorStore } from "@/store/editor-store";
import { useHistoryStore } from "@/store/history-store";
import { useWorkflowRun } from "@/components/workflow-run-context";

type DynamicField = {
  nodeId: string;
  id: string;
  name: string;
  type: string;
  value: string;
};

type HistoryFilter = "ui" | "api";

const EMPTY_RUNS: RunHistoryEntry[] = [];

function readDynamicFields(
  nodes: ReturnType<typeof useEditorStore.getState>["nodes"],
): DynamicField[] {
  const out: DynamicField[] = [];
  for (const node of nodes) {
    if (node.type !== "request") continue;
    const raw = (node.data as { dynamicFields?: unknown }).dynamicFields;
    if (!Array.isArray(raw)) continue;
    for (const field of raw) {
      if (!field || typeof field !== "object") continue;
      const f = field as Record<string, unknown>;
      const id = typeof f.id === "string" ? f.id : "";
      const name = typeof f.name === "string" ? f.name : "";
      if (!id || !name) continue;
      out.push({
        nodeId: node.id,
        id,
        name,
        type: typeof f.type === "string" ? f.type : "text",
        value: typeof f.value === "string" ? f.value : "",
      });
    }
  }
  return out;
}

function statusLabel(status: RunStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function statusClass(status: RunStatus): string {
  if (status === "completed") {
    return "rounded-full border border-[color-mix(in_srgb,var(--success)_35%,var(--border))] px-2 py-0.5 text-[11px] font-medium text-[var(--success)]";
  }
  if (status === "failed" || status === "cancelled") {
    return "rounded-full border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] px-2 py-0.5 text-[11px] font-medium text-[var(--danger)]";
  }
  return "rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]";
}

export function PlaygroundPanel({
  workflowId,
  estimateM,
}: {
  workflowId: string;
  estimateM: number | null;
}) {
  const { getToken } = useAuth();
  const runCtx = useWorkflowRun();
  const nodes = useEditorStore((s) => s.nodes);
  const setWorkflowRuns = useHistoryStore((s) => s.setWorkflowRuns);
  const storeWorkflowId = useHistoryStore((s) => s.workflowId);
  const storeRuns = useHistoryStore((s) => s.runs);
  const runs =
    storeWorkflowId === workflowId ? storeRuns : EMPTY_RUNS;

  const schemaFields = useMemo(() => readDynamicFields(nodes), [nodes]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("ui");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const f of schemaFields) {
        const key = `${f.nodeId}:${f.id}`;
        if (!(key in next)) {
          next[key] = f.value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [schemaFields]);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/v1/workflows/${workflowId}/runs`, {
      getToken,
      schema: RunHistoryListResponseSchema,
    })
      .then((res) => {
        if (!cancelled) setWorkflowRuns(workflowId, res.runs);
      })
      .catch(() => {
        /* chrome still renders empty history */
      });
    return () => {
      cancelled = true;
    };
  }, [workflowId, getToken, setWorkflowRuns]);

  const handleRun = useCallback(async () => {
    await runCtx?.runWorkflow();
  }, [runCtx]);

  const visibleRuns: RunHistoryEntry[] = useMemo(() => {
    if (historyFilter === "api") return [];
    const q = search.trim().toLowerCase();
    if (!q) return runs;
    return runs.filter((r) => r.id.toLowerCase().includes(q));
  }, [historyFilter, runs, search]);

  const estLabel =
    estimateM == null ? "Est. —" : `Est. ~${formatDisplayM(estimateM)}M`;

  return (
    <div
      data-testid="playground-panel"
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg)]"
    >
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
        <section
          data-testid="playground-inputs"
          className="flex min-h-0 w-[min(440px,42%)] shrink-0 flex-col rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text)]">
                Inputs
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Configure the input fields for this workflow run.
              </p>
            </div>
            <span
              data-testid="playground-est"
              className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]"
            >
              {estLabel}
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-3">
            {schemaFields.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Add a Request Inputs node on the Workflow tab to expose
                playground fields.
              </p>
            ) : (
              schemaFields.map((field) => {
                const key = `${field.nodeId}:${field.id}`;
                return (
                  <div
                    key={key}
                    data-testid={`playground-input-${field.id}`}
                    className="rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--panel)]"
                  >
                    <div className="flex items-center gap-2 px-3 pt-2.5">
                      <GripIcon />
                      <span className="flex-1 text-[13px] font-medium text-[var(--text)]">
                        {field.name}
                      </span>
                      <span className="text-[11px] capitalize text-[var(--text-muted)]">
                        {field.type}
                      </span>
                    </div>
                    <div className="p-3 pt-2">
                      <textarea
                        data-testid={`playground-field-${field.id}`}
                        value={drafts[key] ?? ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder={`Enter ${field.name}...`}
                        rows={5}
                        className="w-full resize-y rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)]"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-[var(--border)] px-4 py-3">
            <button
              type="button"
              data-testid="playground-run"
              disabled={runCtx?.isBusy}
              onClick={() => void handleRun()}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--accent-primary-cta)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-soft)] disabled:opacity-60"
            >
              <PlayIcon />
              Run
            </button>
          </div>
        </section>

        <section
          data-testid="playground-output"
          className="flex min-h-0 min-w-0 flex-1 flex-col rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)]"
        >
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-[15px] font-semibold text-[var(--text)]">
              Output
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Results from workflow execution.
            </p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10">
            <EmptyPlayIcon />
            <p
              data-testid="playground-empty-output"
              className="text-sm font-medium text-[var(--text)]"
            >
              No output yet
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Run the workflow to see results here
            </p>
          </div>
        </section>
      </div>

      <section
        data-testid="playground-run-history"
        className="mx-3 mb-3 flex h-[220px] shrink-0 flex-col overflow-hidden rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)]"
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-semibold text-[var(--text)]">
            <HistoryClockIcon />
            <span>
              Run History ({historyFilter === "ui" ? runs.length : 0})
            </span>
          </div>
          <div
            data-testid="playground-history-filter"
            className="flex rounded-full border border-[var(--border)] bg-[var(--bg)] p-0.5 text-[11px] font-medium"
          >
            <button
              type="button"
              data-testid="playground-filter-ui"
              data-active={historyFilter === "ui" ? "true" : "false"}
              onClick={() => setHistoryFilter("ui")}
              className={
                historyFilter === "ui"
                  ? "rounded-full bg-[var(--panel)] px-3 py-1 text-[var(--text)] shadow-[var(--shadow-soft)]"
                  : "rounded-full px-3 py-1 text-[var(--text-muted)]"
              }
            >
              UI Runs
            </button>
            <button
              type="button"
              data-testid="playground-filter-api"
              data-active={historyFilter === "api" ? "true" : "false"}
              onClick={() => setHistoryFilter("api")}
              className={
                historyFilter === "api"
                  ? "rounded-full bg-[var(--panel)] px-3 py-1 text-[var(--text)] shadow-[var(--shadow-soft)]"
                  : "rounded-full px-3 py-1 text-[var(--text-muted)]"
              }
            >
              API Runs
            </button>
          </div>
          <label className="relative flex items-center">
            <span className="pointer-events-none absolute left-2.5 text-[var(--text-muted)]">
              <SearchIcon />
            </span>
            <input
              data-testid="playground-history-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Run ID..."
              className="h-8 w-52 rounded-full border border-[var(--border)] bg-[var(--panel)] py-1 pl-8 pr-3 text-xs text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="px-4 py-2 font-medium">Date &amp; Time</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Used credits</th>
                <th className="px-4 py-2 font-medium">Run ID</th>
              </tr>
            </thead>
            <tbody>
              {visibleRuns.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    data-testid="playground-history-empty"
                    className="px-4 py-10 text-center text-sm text-[var(--text-muted)]"
                  >
                    {historyFilter === "api"
                      ? "No API run yet."
                      : "No UI run yet."}
                  </td>
                </tr>
              ) : (
                visibleRuns.map((run) => (
                  <tr
                    key={run.id}
                    data-testid={`playground-history-row-${run.id}`}
                    className="border-b border-[var(--border)]"
                  >
                    <td className="px-4 py-2.5 text-[var(--text)]">
                      {formatRunWhen(run.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={statusClass(run.status)}>
                        {statusLabel(run.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">—</td>
                    <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-[var(--text-muted)]">
                      {run.id}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatRunWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 3h8M2 6h8M2 9h8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        className="text-[var(--text-muted)]"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M4 2.5v9l8-4.5L4 2.5Z" fill="currentColor" />
    </svg>
  );
}

function EmptyPlayIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className="text-[var(--border)]"
    >
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M21 17.5v13l11-6.5-11-6.5Z" fill="currentColor" />
    </svg>
  );
}

function HistoryClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M8 5v3.2L10 10"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="5" cy="5" r="3.25" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M7.5 7.5L10 10"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
