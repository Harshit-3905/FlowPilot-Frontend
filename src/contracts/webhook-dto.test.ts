import { describe, expect, it } from "vitest";
import {
  StartPublicRunBodySchema,
  resolvePublicRunWebhook,
  WebhookPayloadSchema,
} from "./index";

describe("webhook contracts", () => {
  it("parses all outbound payload variants", () => {
    const at = "2026-07-30T12:00:00.000Z";
    expect(
      WebhookPayloadSchema.parse({
        type: "run.started",
        runId: "r1",
        workflowId: "w1",
        scope: "workflow",
        at,
      }).type,
    ).toBe("run.started");
    expect(
      WebhookPayloadSchema.parse({
        type: "run.completed",
        runId: "r1",
        status: "completed",
        at,
      }).type,
    ).toBe("run.completed");
    expect(
      WebhookPayloadSchema.parse({
        type: "run.failed",
        runId: "r1",
        status: "failed",
        error: { message: "x" },
        at,
      }).type,
    ).toBe("run.failed");
    expect(
      WebhookPayloadSchema.parse({
        type: "node.completed",
        runId: "r1",
        nodeId: "n1",
        status: "completed",
        output: { ok: true },
        at,
      }).type,
    ).toBe("node.completed");
  });

  it("resolves nested webhook and flat webhookUrl", () => {
    expect(
      resolvePublicRunWebhook(
        StartPublicRunBodySchema.parse({
          workflowId: "wf",
          webhook: {
            url: "https://hooks.example/a",
            events: ["run.completed", "run.failed"],
          },
        }),
      ),
    ).toEqual({
      url: "https://hooks.example/a",
      events: ["run.completed", "run.failed"],
    });

    expect(
      resolvePublicRunWebhook(
        StartPublicRunBodySchema.parse({
          workflowId: "wf",
          webhookUrl: "https://hooks.example/b",
        }),
      ),
    ).toEqual({ url: "https://hooks.example/b", events: null });

    expect(
      resolvePublicRunWebhook(
        StartPublicRunBodySchema.parse({ workflowId: "wf" }),
      ),
    ).toBeNull();
  });

  it("rejects mismatched webhook.url vs webhookUrl", () => {
    expect(
      StartPublicRunBodySchema.safeParse({
        workflowId: "wf",
        webhookUrl: "https://hooks.example/a",
        webhook: { url: "https://hooks.example/b" },
      }).success,
    ).toBe(false);
  });
});
