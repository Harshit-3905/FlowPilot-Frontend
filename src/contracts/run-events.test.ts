import { describe, expect, it } from "vitest";
import {
  RunCompletedEventSchema,
  RunFailedEventSchema,
  RunNodeUpdatedEventSchema,
  RunRealtimeEventSchema,
  RunStartedEventSchema,
  SubscribeResponseSchema,
} from "./run-events";

const at = "2026-07-29T12:00:00.000Z";

describe("RunRealtimeEventSchema", () => {
  it("parses run.started", () => {
    const parsed = RunStartedEventSchema.parse({
      type: "run.started",
      runId: "run_1",
      workflowId: "wf_1",
      scope: "workflow",
      at,
    });
    expect(parsed.type).toBe("run.started");
    expect(RunRealtimeEventSchema.parse(parsed).type).toBe("run.started");
  });

  it("parses run.node.updated with optional partialOutput", () => {
    const parsed = RunNodeUpdatedEventSchema.parse({
      type: "run.node.updated",
      runId: "run_1",
      nodeId: "node_a",
      status: "completed",
      partialOutput: { result: "https://example.com/x.png" },
      at,
    });
    expect(parsed.partialOutput).toEqual({
      result: "https://example.com/x.png",
    });
  });

  it("parses run.completed and run.failed", () => {
    expect(
      RunCompletedEventSchema.parse({
        type: "run.completed",
        runId: "run_1",
        status: "completed",
        summary: "done",
        at,
      }).status,
    ).toBe("completed");

    expect(
      RunFailedEventSchema.parse({
        type: "run.failed",
        runId: "run_1",
        status: "failed",
        error: { message: "boom" },
        at,
      }).error,
    ).toEqual({ message: "boom" });
  });

  it("rejects unknown event type via union", () => {
    expect(() =>
      RunRealtimeEventSchema.parse({
        type: "run.unknown",
        runId: "run_1",
        at,
      }),
    ).toThrow();
  });
});

describe("SubscribeResponseSchema", () => {
  it("parses token + channel + expiresAt", () => {
    const parsed = SubscribeResponseSchema.parse({
      token: "tok_abc",
      channel: "run:run_1",
      expiresAt: at,
    });
    expect(parsed.channel).toBe("run:run_1");
  });
});
