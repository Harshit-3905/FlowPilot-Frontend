"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  RunDetailResponseSchema,
  RunHistoryListResponseSchema,
  getNode,
  runScopeLabel,
  type AttemptOutcome,
  type RunHistoryEntry,
  type RunNodeAttempt,
  type RunNodeDetail,
  type RunStatus,
} from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { extractAssetUrls } from "@/lib/asset-urls";
import { formatDisplayM, toDisplayM } from "@/lib/format-credits";
import { AssetLinks } from "@/components/asset-links";
import { useHistoryStore } from "@/store/history-store";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

type DetailState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export function HistorySidebar({ workflowId }: { workflowId: string }) {
  const { getToken } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [detail, setDetail] = useState<DetailState>({ kind: "idle" });

  const runs = useHistoryStore((s) => s.runs);
  const selectedRunId = useHistoryStore((s) => s.selectedRunId);
  const detailNodes = useHistoryStore((s) => s.detailNodes);
  const setWorkflowRuns = useHistoryStore((s) => s.setWorkflowRuns);
  const selectRun = useHistoryStore((s) => s.selectRun);
  const setDetailNodes = useHistoryStore((s) => s.setDetailNodes);

  useEffect(() => {
    if (!workflowId) return;
    let cancelled = false;
    setState({ kind: "loading" });
    setDetail({ kind: "idle" });

    apiFetch(`/api/v1/workflows/${workflowId}/runs`, {
      getToken,
      schema: RunHistoryListResponseSchema,
    })
      .then((res) => {
        if (cancelled) return;
        setWorkflowRuns(workflowId, res.runs);
        setState({ kind: "ready" });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workflowId, getToken, setWorkflowRuns]);

  useEffect(() => {
    if (!selectedRunId) {
      setDetail({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setDetail({ kind: "loading" });

    apiFetch(`/api/v1/runs/${selectedRunId}`, {
      getToken,
      schema: RunDetailResponseSchema,
    })
      .then((res) => {
        if (cancelled) return;
        setDetailNodes(selectedRunId, res.nodes);
        setDetail({ kind: "ready" });
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRunId, getToken, setDetailNodes]);

  return (
    <aside
      data-testid="history-sidebar"
      className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--panel)]"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <HistoryClockIcon />
        <h2 className="text-sm font-semibold text-[var(--text)]">
          History
          {state.kind === "ready" ? (
            <span className="ml-1 font-normal text-[var(--text-muted)]">
              ({runs.length})
            </span>
          ) : null}
        </h2>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {state.kind === "loading" ? (
            <p
              data-testid="history-loading"
              className="px-3 py-6 text-center text-xs text-[var(--text-muted)]"
            >
              Loading runs…
            </p>
          ) : null}

          {state.kind === "error" ? (
            <p
              data-testid="history-error"
              role="alert"
              className="px-3 py-6 text-center text-xs text-[var(--danger)]"
            >
              {state.message}
            </p>
          ) : null}

          {state.kind === "ready" && runs.length === 0 ? (
            <p
              data-testid="history-empty"
              className="px-3 py-8 text-center text-sm text-[var(--text-muted)]"
            >
              No runs yet.
            </p>
          ) : null}

          {state.kind === "ready" && runs.length > 0 ? (
            <ul data-testid="history-list" className="divide-y divide-[var(--border)]">
              {runs.map((run) => (
                <HistoryRunRow
                  key={run.id}
                  run={run}
                  selected={run.id === selectedRunId}
                  onSelect={() => selectRun(run.id)}
                />
              ))}
            </ul>
          ) : null}
        </div>

        {selectedRunId ? (
          <RunDetailPanel detail={detail} nodes={detailNodes} />
        ) : null}
      </div>
    </aside>
  );
}

function HistoryRunRow({
  run,
  selected,
  onSelect,
}: {
  run: RunHistoryEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        data-testid={`history-run-${run.id}`}
        data-run-id={run.id}
        data-status={run.status}
        data-scope={run.scope}
        data-selected={selected ? "true" : undefined}
        onClick={onSelect}
        className={`w-full px-3 py-2.5 text-left transition-colors ${
          selected
            ? "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
            : "hover:bg-[color-mix(in_srgb,var(--text)_4%,transparent)]"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <time
            data-testid="history-run-timestamp"
            dateTime={run.createdAt}
            className="text-xs font-medium text-[var(--text)]"
          >
            {formatTimestamp(run.createdAt)}
          </time>
          <StatusBadge status={run.status} testId="history-run-status" />
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span data-testid="history-run-scope">
            {runScopeLabel(run.scope)}
          </span>
          <span aria-hidden>·</span>
          <span data-testid="history-run-duration">
            {formatDuration(run.durationMs)}
          </span>
        </div>
      </button>
    </li>
  );
}


function RunDetailPanel({
  detail,
  nodes,
}: {
  detail: DetailState;
  nodes: RunNodeDetail[] | null;
}) {
  return (
    <section
      data-testid="run-detail"
      className="flex max-h-[50%] min-h-0 shrink-0 flex-col border-t border-[var(--border)] bg-[var(--bg)]"
    >
      <header className="shrink-0 border-b border-[var(--border)] px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Run detail
        </h3>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {detail.kind === "loading" ? (
          <p
            data-testid="run-detail-loading"
            className="px-3 py-4 text-center text-xs text-[var(--text-muted)]"
          >
            Loading detail…
          </p>
        ) : null}

        {detail.kind === "error" ? (
          <p
            data-testid="run-detail-error"
            role="alert"
            className="px-3 py-4 text-center text-xs text-[var(--danger)]"
          >
            {detail.message}
          </p>
        ) : null}

        {detail.kind === "ready" && (nodes?.length ?? 0) === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">
            No nodes in this run.
          </p>
        ) : null}

        {detail.kind === "ready" && nodes && nodes.length > 0 ? (
          <ul
            data-testid="run-detail-nodes"
            className="divide-y divide-[var(--border)]"
          >
            {nodes.map((node) => (
              <RunNodeRow key={node.id} node={node} />
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function RunNodeRow({ node }: { node: RunNodeDetail }) {
  const provider = providerLabel(node.nodeType);
  const timing = nodeDurationMs(node.startedAt, node.completedAt);
  const errorMsg =
    node.status === "failed" ? nodeErrorMessage(node.error) : null;
  const costLabel =
    node.costCredits != null
      ? `${formatDisplayM(toDisplayM(node.costDisplayM, node.costCredits))} M`
      : null;
  const attempts = node.attempts ?? [];
  const hasLogs = hasLogEntries(node.logs);

  return (
    <li
      data-testid={`run-detail-node-${node.id}`}
      data-node-id={node.nodeId}
      data-status={node.status}
      className="space-y-1.5 px-3 py-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--text)]">
            {node.nodeType}
          </p>
          <p
            data-testid="run-detail-node-provider"
            className="text-[10px] text-[var(--text-muted)]"
          >
            {provider}
          </p>
        </div>
        <StatusBadge status={node.status} testId="run-detail-node-status" />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
        <span data-testid="run-detail-node-time">{formatDuration(timing)}</span>
        <span aria-hidden>·</span>
        <span>
          attempt {node.attempt}
          {attempts.length > 0 ? ` (${attempts.length})` : ""}
        </span>
        {costLabel ? (
          <>
            <span aria-hidden>·</span>
            <span data-testid="run-detail-node-cost">{costLabel}</span>
          </>
        ) : null}
      </div>

      <div className="space-y-1">
        <JsonField
          label="Input"
          testId="run-detail-node-input"
          value={node.input}
        />
        <JsonField
          label="Output"
          testId="run-detail-node-output"
          value={node.output}
        />
      </div>

      {attempts.length > 0 ? (
        <AttemptsTable attempts={attempts} />
      ) : null}

      {node.status === "failed" ? (
        <p
          data-testid="run-detail-node-error"
          role="alert"
          className="rounded border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-2 py-1.5 text-[10px] text-[var(--danger)]"
        >
          {errorMsg ?? "Error"}
        </p>
      ) : null}

      {hasLogs ? <NodeLogsPanel logs={node.logs} /> : null}
    </li>
  );
}

function AttemptsTable({ attempts }: { attempts: RunNodeAttempt[] }) {
  return (
    <div data-testid="run-detail-node-attempts">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        Attempts
      </p>
      <div className="mt-0.5 overflow-x-auto rounded border border-[var(--border)]">
        <table className="w-full min-w-[220px] border-collapse text-left text-[10px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--panel)] text-[var(--text-muted)]">
              <th className="px-1.5 py-1 font-medium">Provider</th>
              <th className="px-1.5 py-1 font-medium">Outcome</th>
              <th className="px-1.5 py-1 font-medium">Time</th>
              <th className="px-1.5 py-1 font-medium">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {attempts.map((attempt, index) => {
              const rowKey = attempt.id ?? `${attempt.providerId}-${index}`;
              const duration = nodeDurationMs(
                attempt.startedAt,
                attempt.endedAt,
              );
              const attemptError = nodeErrorMessage(attempt.error ?? null);
              return (
                <tr
                  key={rowKey}
                  data-testid={`run-detail-attempt-${index}`}
                  data-outcome={attempt.outcome}
                  data-provider={attempt.providerId}
                >
                  <td className="max-w-[7rem] truncate px-1.5 py-1 font-mono text-[var(--text)]">
                    {attempt.providerId}
                  </td>
                  <td className="px-1.5 py-1">
                    <AttemptOutcomeBadge outcome={attempt.outcome} />
                  </td>
                  <td
                    data-testid={`run-detail-attempt-${index}-time`}
                    className="whitespace-nowrap px-1.5 py-1 text-[var(--text-muted)]"
                  >
                    {formatDuration(duration)}
                  </td>
                  <td
                    data-testid={`run-detail-attempt-${index}-error`}
                    className="max-w-[8rem] truncate px-1.5 py-1 text-[var(--danger)]"
                    title={attemptError ?? undefined}
                  >
                    {attemptError ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttemptOutcomeBadge({ outcome }: { outcome: AttemptOutcome }) {
  return (
    <span
      data-testid="run-detail-attempt-outcome"
      data-outcome={outcome}
      className={`rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${attemptOutcomeClass(outcome)}`}
    >
      {outcome}
    </span>
  );
}

function attemptOutcomeClass(outcome: AttemptOutcome): string {
  switch (outcome) {
    case "success":
      return "bg-[color-mix(in_srgb,var(--success)_18%,white)] text-[var(--success)]";
    case "timeout":
      return "bg-[color-mix(in_srgb,var(--accent-play)_14%,white)] text-[var(--accent-play)]";
    case "failed":
    default:
      return "bg-[color-mix(in_srgb,var(--danger)_14%,white)] text-[var(--danger)]";
  }
}

function NodeLogsPanel({ logs }: { logs: unknown }) {
  const entries = normalizeLogEntries(logs);
  return (
    <details
      data-testid="run-detail-node-logs"
      className="rounded border border-[var(--border)] bg-[var(--panel)]"
    >
      <summary className="cursor-pointer px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        Logs{entries.length > 0 ? ` (${entries.length})` : ""}
      </summary>
      <pre
        data-testid="run-detail-node-logs-body"
        className="max-h-28 overflow-auto border-t border-[var(--border)] px-2 py-1.5 font-mono text-[10px] leading-snug text-[var(--text)]"
      >
        {formatLogsBody(logs)}
      </pre>
    </details>
  );
}

export function hasLogEntries(logs: unknown): boolean {
  if (logs == null) return false;
  if (Array.isArray(logs)) return logs.length > 0;
  if (typeof logs === "string") return logs.trim().length > 0;
  if (typeof logs === "object") return Object.keys(logs).length > 0;
  return true;
}

type NormalizedLogEntry = {
  at?: string;
  level?: string;
  message: string;
  providerId?: string;
};

export function normalizeLogEntries(logs: unknown): NormalizedLogEntry[] {
  if (!Array.isArray(logs)) return [];
  const out: NormalizedLogEntry[] = [];
  for (const entry of logs) {
    if (typeof entry === "string") {
      out.push({ message: entry });
      continue;
    }
    if (entry && typeof entry === "object") {
      const obj = entry as Record<string, unknown>;
      const message =
        typeof obj.message === "string"
          ? obj.message
          : formatJsonSummary(entry);
      out.push({
        at: typeof obj.at === "string" ? obj.at : undefined,
        level: typeof obj.level === "string" ? obj.level : undefined,
        message,
        providerId:
          typeof obj.providerId === "string" ? obj.providerId : undefined,
      });
    }
  }
  return out;
}

export function formatLogsBody(logs: unknown): string {
  if (logs == null) return "—";
  if (typeof logs === "string") return logs;
  const entries = normalizeLogEntries(logs);
  if (entries.length > 0) {
    return entries
      .map((e) => {
        const parts = [
          e.at ? e.at : null,
          e.level ? e.level.toUpperCase() : null,
          e.providerId ? `[${e.providerId}]` : null,
          e.message,
        ].filter(Boolean);
        return parts.join(" ");
      })
      .join("\n");
  }
  return formatJsonSummary(logs);
}

function JsonField({
  label,
  testId,
  value,
}: {
  label: string;
  testId: string;
  value: unknown;
}) {
  const urls = extractAssetUrls(value);
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <pre
        data-testid={testId}
        className="mt-0.5 max-h-16 overflow-auto rounded bg-[var(--panel)] px-1.5 py-1 font-mono text-[10px] leading-snug text-[var(--text)]"
      >
        {formatJsonSummary(value)}
      </pre>
      {urls.length > 0 ? (
        <AssetLinks urls={urls} testIdPrefix={testId} />
      ) : null}
    </div>
  );
}

function StatusBadge({
  status,
  testId,
}: {
  status: RunStatus;
  testId: string;
}) {
  return (
    <span
      data-testid={testId}
      data-status={status}
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(status)}`}
    >
      {status}
    </span>
  );
}

function statusBadgeClass(status: RunStatus): string {
  switch (status) {
    case "completed":
      return "bg-[color-mix(in_srgb,var(--success)_18%,white)] text-[var(--success)]";
    case "failed":
      return "bg-[color-mix(in_srgb,var(--danger)_14%,white)] text-[var(--danger)]";
    case "running":
      return "bg-[color-mix(in_srgb,var(--accent-play)_14%,white)] text-[var(--accent-play)]";
    case "cancelled":
      return "bg-[var(--bg)] text-[var(--text-muted)]";
    case "queued":
    default:
      return "bg-[var(--bg)] text-[var(--text-muted)]";
  }
}

function providerLabel(nodeType: string): string {
  const def = getNode(nodeType);
  return def?.provider?.kind ?? nodeType;
}

function nodeDurationMs(
  startedAt: string | null,
  completedAt: string | null,
): number | null {
  if (!startedAt || !completedAt) return null;
  const start = Date.parse(startedAt);
  const end = Date.parse(completedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return end - start;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(durationMs: number | null): string {
  if (durationMs == null) return "—";
  if (durationMs < 1000) return `${durationMs}ms`;
  const seconds = durationMs / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return `${minutes}m ${rem}s`;
}

export function formatJsonSummary(value: unknown): string {
  if (value == null) return "—";
  try {
    const text = JSON.stringify(value);
    if (text.length <= 200) return text;
    return `${text.slice(0, 197)}…`;
  } catch {
    return String(value);
  }
}

export function nodeErrorMessage(error: unknown): string | null {
  if (error == null) return null;
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function HistoryClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-[var(--text-muted)]"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
