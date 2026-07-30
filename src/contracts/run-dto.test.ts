import { describe, expect, it } from "vitest";
import {
  RUN_SCOPE_LABELS,
  RunHistoryEntrySchema,
  RunHistoryListResponseSchema,
  RunNodeDetailSchema,
  RunScopeSchema,
  runScopeLabel,
} from "./run-dto";

describe("RunNodeDetailSchema", () => {
  it("accepts costCredits microcredits + optional costDisplayM", () => {
    const parsed = RunNodeDetailSchema.parse({
      id: "rn_1",
      nodeId: "n1",
      nodeType: "gpt_image_2",
      status: "completed",
      input: null,
      output: null,
      error: null,
      attempt: 1,
      costCredits: 210_000,
      costDisplayM: 0.21,
      startedAt: "2026-07-30T10:00:00.000Z",
      completedAt: "2026-07-30T10:00:01.000Z",
    });
    expect(parsed.costCredits).toBe(210_000);
    expect(parsed.costDisplayM).toBe(0.21);
  });

  it("accepts null costCredits for queued/cancelled nodes", () => {
    const parsed = RunNodeDetailSchema.parse({
      id: "rn_2",
      nodeId: "n2",
      nodeType: "gpt_image_2",
      status: "cancelled",
      input: null,
      output: null,
      error: null,
      attempt: 1,
      costCredits: null,
      startedAt: null,
      completedAt: "2026-07-30T10:00:01.000Z",
    });
    expect(parsed.costCredits).toBeNull();
  });
});

describe("RunHistoryListResponseSchema", () => {
  it("accepts history entries with timestamp, status, duration, scope", () => {
    const parsed = RunHistoryListResponseSchema.safeParse({
      runs: [
        {
          id: "run_1",
          workflowId: "wf_1",
          status: "completed",
          scope: "workflow",
          createdAt: "2026-07-30T10:00:00.000Z",
          completedAt: "2026-07-30T10:00:05.000Z",
          durationMs: 5000,
        },
        {
          id: "run_2",
          workflowId: "wf_1",
          status: "running",
          scope: "node",
          createdAt: "2026-07-30T10:01:00.000Z",
          completedAt: null,
          durationMs: null,
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.runs).toHaveLength(2);
    expect(parsed.data.runs[0]?.scope).toBe("workflow");
    expect(parsed.data.runs[1]?.durationMs).toBeNull();
  });

  it("rejects invalid scope", () => {
    const parsed = RunHistoryEntrySchema.safeParse({
      id: "run_1",
      workflowId: "wf_1",
      status: "queued",
      scope: "group",
      createdAt: "2026-07-30T10:00:00.000Z",
      completedAt: null,
      durationMs: null,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("runScopeLabel", () => {
  it("maps every RunScope to product sidebar copy", () => {
    expect(runScopeLabel("workflow")).toBe("Workflow");
    expect(runScopeLabel("node")).toBe("Node");
    for (const scope of RunScopeSchema.options) {
      expect(runScopeLabel(scope)).toBe(RUN_SCOPE_LABELS[scope]);
      expect(RUN_SCOPE_LABELS[scope].length).toBeGreaterThan(0);
    }
  });
});
