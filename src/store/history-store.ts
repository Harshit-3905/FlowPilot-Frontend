import { create } from "zustand";
import type {
  RunHistoryEntry,
  RunNodeDetail,
  RunRealtimeEvent,
  RunScope,
  RunStatus,
} from "@/contracts";

export type HistoryState = {
  workflowId: string | null;
  runs: RunHistoryEntry[];
  selectedRunId: string | null;
  detailNodes: RunNodeDetail[] | null;
  /** Run whose node statuses drive canvas chrome. */
  liveRunId: string | null;
  /** Graph nodeId → latest status from active-run realtime events. */
  liveNodeStatuses: Record<string, RunStatus>;
  /** Graph nodeId → latest partial/full output for canvas preview. */
  liveNodeOutputs: Record<string, unknown>;
  setWorkflowRuns: (workflowId: string, runs: RunHistoryEntry[]) => void;
  selectRun: (runId: string | null) => void;
  setDetailNodes: (runId: string, nodes: RunNodeDetail[]) => void;
  /** Optimistic list insert when Play returns a runId before SSE. */
  ensureRunningEntry: (entry: {
    id: string;
    workflowId: string;
    scope: RunScope;
    createdAt?: string;
  }) => void;
  applyRealtimeEvent: (event: RunRealtimeEvent) => void;
  reset: () => void;
};

export function selectLiveNodeStatus(
  state: Pick<HistoryState, "liveNodeStatuses">,
  nodeId: string,
): RunStatus | "idle" {
  return state.liveNodeStatuses[nodeId] ?? "idle";
}

export function selectLiveNodeOutput(
  state: Pick<HistoryState, "liveNodeOutputs">,
  nodeId: string,
): unknown {
  return state.liveNodeOutputs[nodeId];
}

function durationMs(createdAt: string, completedAt: string): number | null {
  const start = Date.parse(createdAt);
  const end = Date.parse(completedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return end - start;
}

function patchListStatus(
  runs: RunHistoryEntry[],
  runId: string,
  status: RunStatus,
  at: string,
): RunHistoryEntry[] {
  return runs.map((run) => {
    if (run.id !== runId) return run;
    return {
      ...run,
      status,
      completedAt: at,
      durationMs: durationMs(run.createdAt, at),
    };
  });
}

function patchDetailNode(
  nodes: RunNodeDetail[],
  event: Extract<RunRealtimeEvent, { type: "run.node.updated" }>,
): RunNodeDetail[] {
  return nodes.map((node) => {
    if (node.nodeId !== event.nodeId) return node;
    const terminal =
      event.status === "completed" ||
      event.status === "failed" ||
      event.status === "cancelled";
    return {
      ...node,
      status: event.status,
      error: event.error !== undefined ? event.error : node.error,
      output:
        event.partialOutput !== undefined ? event.partialOutput : node.output,
      completedAt: terminal ? event.at : node.completedAt,
      startedAt:
        event.status === "running" && !node.startedAt
          ? event.at
          : node.startedAt,
    };
  });
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  workflowId: null,
  runs: [],
  selectedRunId: null,
  detailNodes: null,
  liveRunId: null,
  liveNodeStatuses: {},
  liveNodeOutputs: {},

  setWorkflowRuns: (workflowId, runs) => {
    const prev = get();
    const keep =
      prev.workflowId === workflowId
        ? prev.runs.filter(
            (r) =>
              !runs.some((a) => a.id === r.id) &&
              (r.status === "running" || r.status === "queued"),
          )
        : [];
    const sameWorkflow = prev.workflowId === workflowId;
    set({
      workflowId,
      runs: [...keep, ...runs],
      selectedRunId: null,
      detailNodes: null,
      ...(sameWorkflow
        ? {}
        : {
            liveRunId: null,
            liveNodeStatuses: {} as Record<string, RunStatus>,
            liveNodeOutputs: {} as Record<string, unknown>,
          }),
    });
  },

  selectRun: (runId) =>
    set({
      selectedRunId: runId,
      detailNodes: null,
    }),

  setDetailNodes: (runId, nodes) => {
    if (get().selectedRunId !== runId) return;
    set({ detailNodes: nodes });
  },

  ensureRunningEntry: ({ id, workflowId, scope, createdAt }) => {
    const state = get();
    if (state.workflowId !== null && state.workflowId !== workflowId) return;
    if (state.runs.some((r) => r.id === id)) {
      set({ liveRunId: id });
      return;
    }
    const entry: RunHistoryEntry = {
      id,
      workflowId,
      status: "running",
      scope,
      createdAt: createdAt ?? new Date().toISOString(),
      completedAt: null,
      durationMs: null,
    };
    set({
      workflowId: state.workflowId ?? workflowId,
      runs: [entry, ...state.runs],
      liveRunId: id,
      liveNodeStatuses: {},
      liveNodeOutputs: {},
    });
  },

  applyRealtimeEvent: (event) => {
    const state = get();

    switch (event.type) {
      case "run.started": {
        if (
          state.workflowId !== null &&
          state.workflowId !== event.workflowId
        ) {
          return;
        }
        const existing = state.runs.find((r) => r.id === event.runId);
        if (existing) {
          set({
            workflowId: state.workflowId ?? event.workflowId,
            runs: state.runs.map((r) =>
              r.id === event.runId
                ? {
                    ...r,
                    status: "running" as const,
                    scope: event.scope,
                    completedAt: null,
                    durationMs: null,
                  }
                : r,
            ),
            liveRunId: event.runId,
            liveNodeStatuses: {},
            liveNodeOutputs: {},
          });
          return;
        }
        const entry: RunHistoryEntry = {
          id: event.runId,
          workflowId: event.workflowId,
          status: "running",
          scope: event.scope,
          createdAt: event.at,
          completedAt: null,
          durationMs: null,
        };
        set({
          workflowId: state.workflowId ?? event.workflowId,
          runs: [entry, ...state.runs],
          liveRunId: event.runId,
          liveNodeStatuses: {},
          liveNodeOutputs: {},
        });
        return;
      }

      case "run.node.updated": {
        const runs = state.runs.map((r) =>
          r.id === event.runId &&
          (r.status === "queued" || r.status === "running")
            ? { ...r, status: "running" as const }
            : r,
        );
        const detailNodes =
          state.selectedRunId === event.runId && state.detailNodes
            ? patchDetailNode(state.detailNodes, event)
            : state.detailNodes;
        const adoptLive =
          state.liveRunId === null || state.liveRunId === event.runId;
        const prevLive =
          state.liveRunId === event.runId
            ? {
                statuses: state.liveNodeStatuses,
                outputs: state.liveNodeOutputs,
              }
            : { statuses: {}, outputs: {} };
        const liveNodeStatuses = adoptLive
          ? {
              ...prevLive.statuses,
              [event.nodeId]: event.status,
            }
          : state.liveNodeStatuses;
        const liveNodeOutputs = adoptLive
          ? event.partialOutput !== undefined
            ? {
                ...prevLive.outputs,
                [event.nodeId]: event.partialOutput,
              }
            : prevLive.outputs
          : state.liveNodeOutputs;
        set({
          runs,
          detailNodes,
          ...(adoptLive
            ? { liveRunId: event.runId, liveNodeStatuses, liveNodeOutputs }
            : {}),
        });
        return;
      }

      case "run.completed": {
        set({
          runs: patchListStatus(
            state.runs,
            event.runId,
            "completed",
            event.at,
          ),
        });
        return;
      }

      case "run.failed": {
        set({
          runs: patchListStatus(state.runs, event.runId, "failed", event.at),
        });
        return;
      }
    }
  },

  reset: () =>
    set({
      workflowId: null,
      runs: [],
      selectedRunId: null,
      detailNodes: null,
      liveRunId: null,
      liveNodeStatuses: {},
      liveNodeOutputs: {},
    }),
}));
