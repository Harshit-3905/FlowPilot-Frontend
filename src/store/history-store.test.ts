import { beforeEach, describe, expect, it } from "vitest";
import { useHistoryStore } from "./history-store";
import type { RunHistoryEntry, RunNodeDetail } from "@/contracts";

const baseRun = (overrides: Partial<RunHistoryEntry> = {}): RunHistoryEntry => ({
  id: "run_hist_2",
  workflowId: "wf_1",
  status: "running",
  scope: "node",
  createdAt: "2026-07-30T10:01:00.000Z",
  completedAt: null,
  durationMs: null,
  ...overrides,
});

const baseNode = (overrides: Partial<RunNodeDetail> = {}): RunNodeDetail => ({
  id: "rn_hist_2a",
  nodeId: "node_1",
  nodeType: "gpt_image_2",
  status: "running",
  input: { prompt: "in progress" },
  output: null,
  error: null,
  attempt: 1,
  costCredits: null,
  startedAt: "2026-07-30T10:01:00.000Z",
  completedAt: null,
  ...overrides,
});

beforeEach(() => {
  useHistoryStore.getState().reset();
});

describe("history-store applyRealtimeEvent", () => {
  it("run.started upserts a running list entry without replacing others", () => {
    useHistoryStore.getState().setWorkflowRuns("wf_1", [
      baseRun({ id: "run_old", status: "completed" }),
    ]);

    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.started",
      runId: "run_new",
      workflowId: "wf_1",
      scope: "workflow",
      at: "2026-07-30T11:00:00.000Z",
    });

    const { runs } = useHistoryStore.getState();
    expect(runs[0]?.id).toBe("run_new");
    expect(runs[0]?.status).toBe("running");
    expect(runs[0]?.scope).toBe("workflow");
    expect(runs).toHaveLength(2);
  });

  it("run.node.updated patches open detail nodes by nodeId", () => {
    useHistoryStore.getState().setWorkflowRuns("wf_1", [baseRun()]);
    useHistoryStore.getState().selectRun("run_hist_2");
    useHistoryStore.getState().setDetailNodes("run_hist_2", [baseNode()]);

    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.node.updated",
      runId: "run_hist_2",
      nodeId: "node_1",
      status: "completed",
      partialOutput: { url: "https://cdn.example/done.png" },
      at: "2026-07-30T10:01:05.000Z",
    });

    const node = useHistoryStore.getState().detailNodes?.[0];
    expect(node?.status).toBe("completed");
    expect(node?.output).toEqual({ url: "https://cdn.example/done.png" });
    expect(node?.completedAt).toBe("2026-07-30T10:01:05.000Z");
  });

  it("run.node.updated ignores detail when another run is selected", () => {
    useHistoryStore.getState().setWorkflowRuns("wf_1", [baseRun()]);
    useHistoryStore.getState().selectRun("run_other");
    useHistoryStore.getState().setDetailNodes("run_other", [
      baseNode({ id: "rn_other", nodeId: "node_x" }),
    ]);

    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.node.updated",
      runId: "run_hist_2",
      nodeId: "node_1",
      status: "completed",
      at: "2026-07-30T10:01:05.000Z",
    });

    expect(useHistoryStore.getState().detailNodes?.[0]?.status).toBe("running");
  });

  it("run.completed updates list status, completedAt, and durationMs", () => {
    useHistoryStore.getState().setWorkflowRuns("wf_1", [baseRun()]);

    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.completed",
      runId: "run_hist_2",
      status: "completed",
      at: "2026-07-30T10:01:08.000Z",
    });

    const run = useHistoryStore.getState().runs[0]!;
    expect(run.status).toBe("completed");
    expect(run.completedAt).toBe("2026-07-30T10:01:08.000Z");
    expect(run.durationMs).toBe(8000);
  });

  it("run.failed updates list status without a page refresh", () => {
    useHistoryStore.getState().setWorkflowRuns("wf_1", [baseRun()]);

    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.failed",
      runId: "run_hist_2",
      status: "failed",
      at: "2026-07-30T10:01:04.000Z",
      error: { message: "boom" },
    });

    const run = useHistoryStore.getState().runs[0]!;
    expect(run.status).toBe("failed");
    expect(run.completedAt).toBe("2026-07-30T10:01:04.000Z");
    expect(run.durationMs).toBe(4000);
  });

  it("run.node.updated maps graph nodeId → liveNodeStatuses for canvas", () => {
    useHistoryStore.getState().setWorkflowRuns("wf_1", [baseRun()]);

    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.node.updated",
      runId: "run_hist_2",
      nodeId: "node_1",
      status: "running",
      at: "2026-07-30T10:01:01.000Z",
    });
    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.node.updated",
      runId: "run_hist_2",
      nodeId: "node_1",
      status: "completed",
      at: "2026-07-30T10:01:05.000Z",
    });
    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.node.updated",
      runId: "run_hist_2",
      nodeId: "node_2",
      status: "failed",
      at: "2026-07-30T10:01:06.000Z",
    });

    const { liveRunId, liveNodeStatuses } = useHistoryStore.getState();
    expect(liveRunId).toBe("run_hist_2");
    expect(liveNodeStatuses.node_1).toBe("completed");
    expect(liveNodeStatuses.node_2).toBe("failed");
  });

  it("run.node.updated with partialOutput appends liveNodeOutputs", () => {
    useHistoryStore.getState().setWorkflowRuns("wf_1", [baseRun()]);

    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.node.updated",
      runId: "run_hist_2",
      nodeId: "node_1",
      status: "completed",
      partialOutput: {
        result: ["https://static.flowpilot.dev/stubs/gpt-image-2/cat-1.png"],
      },
      at: "2026-07-30T10:01:05.000Z",
    });

    expect(useHistoryStore.getState().liveNodeOutputs.node_1).toEqual({
      result: ["https://static.flowpilot.dev/stubs/gpt-image-2/cat-1.png"],
    });
  });

  it("run.failed keeps prior successful liveNodeOutputs", () => {
    useHistoryStore.getState().setWorkflowRuns("wf_1", [baseRun()]);

    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.node.updated",
      runId: "run_hist_2",
      nodeId: "node_ok",
      status: "completed",
      partialOutput: { url: "https://cdn.example/ok.png" },
      at: "2026-07-30T10:01:05.000Z",
    });
    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.node.updated",
      runId: "run_hist_2",
      nodeId: "node_bad",
      status: "failed",
      at: "2026-07-30T10:01:06.000Z",
    });
    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.failed",
      runId: "run_hist_2",
      status: "failed",
      at: "2026-07-30T10:01:07.000Z",
      error: { message: "boom" },
    });

    const { liveNodeStatuses, liveNodeOutputs, runs } =
      useHistoryStore.getState();
    expect(runs[0]?.status).toBe("failed");
    expect(liveNodeStatuses.node_ok).toBe("completed");
    expect(liveNodeStatuses.node_bad).toBe("failed");
    expect(liveNodeOutputs.node_ok).toEqual({
      url: "https://cdn.example/ok.png",
    });
  });

  it("run.started clears liveNodeStatuses for the new live run", () => {
    useHistoryStore.getState().setWorkflowRuns("wf_1", [baseRun()]);
    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.node.updated",
      runId: "run_hist_2",
      nodeId: "node_1",
      status: "completed",
      partialOutput: { url: "https://cdn.example/done.png" },
      at: "2026-07-30T10:01:05.000Z",
    });
    expect(useHistoryStore.getState().liveNodeStatuses.node_1).toBe("completed");
    expect(useHistoryStore.getState().liveNodeOutputs.node_1).toBeDefined();

    useHistoryStore.getState().applyRealtimeEvent({
      type: "run.started",
      runId: "run_new",
      workflowId: "wf_1",
      scope: "workflow",
      at: "2026-07-30T11:00:00.000Z",
    });

    expect(useHistoryStore.getState().liveRunId).toBe("run_new");
    expect(useHistoryStore.getState().liveNodeStatuses).toEqual({});
    expect(useHistoryStore.getState().liveNodeOutputs).toEqual({});
  });
});
