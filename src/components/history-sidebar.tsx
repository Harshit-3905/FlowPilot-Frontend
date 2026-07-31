"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import {
  RunDetailResponseSchema,
  RunHistoryListResponseSchema,
  getNode,
  type AttemptOutcome,
  type RunHistoryEntry,
  type RunNodeAttempt,
  type RunNodeDetail,
  type RunStatus,
} from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { extractAssetUrls } from "@/lib/asset-urls";
import {
  formatDisplayM,
  formatHistoryCreditsM,
  toDisplayM,
} from "@/lib/format-credits";
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

type HistoryFilter = "ui" | "api";

export function HistorySidebar({
  workflowId,
  onClose,
}: {
  workflowId: string;
  onClose?: () => void;
}) {
  const { getToken } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [detail, setDetail] = useState<DetailState>({ kind: "idle" });
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("ui");
  const [runFilter, setRunFilter] = useState<"all">("all");

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

  const visibleRuns = useMemo(() => {
    if (historyFilter === "api") return [];
    return runs;
  }, [historyFilter, runs]);

  return (
    <aside
      data-testid="history-sidebar"
      className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-soft)]"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
        <h2 className="text-[15px] font-semibold text-[var(--text)]">
          Execution History
        </h2>
        {onClose ? (
          <button
            type="button"
            data-testid="history-close"
            onClick={onClose}
            className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Close
          </button>
        ) : null}
      </header>

      <div
        data-testid="history-filter-tabs"
        className="mx-4 flex rounded-lg border border-[var(--border)] bg-[var(--bg)] p-0.5 text-[12px] font-medium"
      >
        <button
          type="button"
          data-testid="history-filter-ui"
          data-active={historyFilter === "ui" ? "true" : "false"}
          onClick={() => setHistoryFilter("ui")}
          className={
            historyFilter === "ui"
              ? "flex-1 rounded-md bg-[var(--panel)] px-3 py-1.5 text-[var(--text)] shadow-[var(--shadow-soft)]"
              : "flex-1 rounded-md px-3 py-1.5 text-[var(--text-muted)]"
          }
        >
          UI Runs
        </button>
        <button
          type="button"
          data-testid="history-filter-api"
          data-active={historyFilter === "api" ? "true" : "false"}
          onClick={() => setHistoryFilter("api")}
          className={
            historyFilter === "api"
              ? "flex-1 rounded-md bg-[var(--panel)] px-3 py-1.5 text-[var(--text)] shadow-[var(--shadow-soft)]"
              : "flex-1 rounded-md px-3 py-1.5 text-[var(--text-muted)]"
          }
        >
          API Runs
        </button>
      </div>

      <div className="mx-4 mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-muted)]">Run history</span>
        <label className="relative">
          <span className="sr-only">Filter runs</span>
          <select
            data-testid="history-run-filter"
            value={runFilter}
            onChange={() => setRunFilter("all")}
            className="h-7 appearance-none rounded-md border border-[var(--border)] bg-[var(--panel)] py-0.5 pl-2 pr-6 text-xs text-[var(--text)] outline-none"
          >
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
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

          {state.kind === "ready" && visibleRuns.length === 0 ? (
            <p
              data-testid="history-empty"
              className="px-3 py-8 text-center text-sm text-[var(--text-muted)]"
            >
              {historyFilter === "api" ? "No API runs yet." : "No runs yet."}
            </p>
          ) : null}

          {state.kind === "ready" && visibleRuns.length > 0 ? (
            <ul data-testid="history-list" className="space-y-1">
              {visibleRuns.map((run) => (
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
  const creditsLabel = historyCreditsLabel(run);
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
        className={`w-full rounded-[var(--field-radius)] px-3 py-2.5 text-left transition-colors ${
          selected
            ? "bg-[color-mix(in_srgb,var(--accent-play)_10%,transparent)]"
            : "hover:bg-[color-mix(in_srgb,var(--text)_4%,transparent)]"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <StatusDot status={run.status} />
            <span
              data-testid="history-run-status"
              data-status={run.status}
              className={`text-sm font-medium ${statusTextClass(run.status)}`}
            >
              {statusDisplayLabel(run.status)}
            </span>
          </div>
          <time
            data-testid="history-run-timestamp"
            dateTime={run.createdAt}
            className="shrink-0 text-[11px] text-[var(--text-muted)]"
          >
            {formatTimestamp(run.createdAt)}
          </time>
        </div>
        <p
          data-testid="history-run-credits"
          className="mt-1 text-[11px] text-[var(--text-muted)]"
        >
          Credits: {creditsLabel}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
          <span data-testid="history-run-scope">{run.scope === "node" ? "Node" : "Workflow"}</span>
          <span aria-hidden>·</span>
          <span data-testid="history-run-duration">
            {formatDuration(run.durationMs)}
          </span>
        </div>
      </button>
    </li>
  );
}

function historyCreditsLabel(run: RunHistoryEntry): string {
  const credits = run.costCredits;
  if (credits == null) return "—";
  const m = toDisplayM(run.costDisplayM, credits);
  return `${formatHistoryCreditsM(m)}M`;
}

function StatusDot({ status }: { status: RunStatus }) {
  return (
    <span
      aria-hidden
      className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${statusDotClass(status)}`}
    />
  );
}

function statusDotClass(status: RunStatus): string {
  switch (status) {
    case "completed":
      return "bg-[var(--success)]";
    case "failed":
      return "bg-[var(--danger)]";
    case "running":
      return "bg-[var(--accent-play)]";
    default:
      return "bg-[var(--text-muted)]";
  }
}

function statusTextClass(status: RunStatus): string {
  switch (status) {
    case "completed":
      return "text-[var(--success)]";
    case "failed":
      return "text-[var(--danger)]";
    case "running":
      return "text-[var(--accent-play)]";
    default:
      return "text-[var(--text-muted)]";
  }
}

export function statusDisplayLabel(status: RunStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
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

/** Status badge tokens: completed `--success`, failed `--danger`, running `--accent-play`. */
export function statusBadgeClass(status: RunStatus): string {
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
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
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
