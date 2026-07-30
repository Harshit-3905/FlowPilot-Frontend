import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import { ApiError } from "@/lib/api-client";
import { canvasNodeStatusChrome } from "@/lib/canvas-node-status";
import {
  CYCLE_DETECTED_MESSAGE,
  INVALID_CONNECTION_MESSAGE,
  describeConnectionRejection,
} from "@/lib/graph-connection-rejection";
import { formatRunStartError } from "@/lib/run-start-error";

/**
 * Doc 09 scenario matrix — FE-visible slices only.
 * Backend-only rows (provider timeout / network retry / webhook miss) are covered in BE tests.
 */
const nodes: Node[] = [
  {
    id: "a",
    type: "gpt_image_2",
    position: { x: 0, y: 0 },
    data: {},
  },
  {
    id: "b",
    type: "gpt_image_2",
    position: { x: 200, y: 0 },
    data: {},
  },
];

describe("09 error scenario matrix (FE-visible)", () => {
  it.each([
    {
      scenario: "Invalid connection",
      code: "INVALID_CONNECTION" as const,
      connection: {
        source: "a",
        sourceHandle: "out:result",
        target: "b",
        targetHandle: "in:prompt",
      },
      edges: [] as { source: string; target: string }[],
      message: INVALID_CONNECTION_MESSAGE,
    },
    {
      scenario: "Cycle detected",
      code: "CYCLE_DETECTED" as const,
      connection: {
        source: "b",
        sourceHandle: "out:result",
        target: "a",
        targetHandle: "in:image_urls",
      },
      edges: [{ source: "a", target: "b" }],
      message: CYCLE_DETECTED_MESSAGE,
    },
  ])("$scenario → toast code $code", ({ code, connection, edges, message }) => {
    const rejection = describeConnectionRejection(nodes, edges, connection);
    expect(rejection).toEqual({ code, message });
    expect(rejection?.message).toContain(code);
  });

  it("allows compatible non-cyclic connection (no rejection)", () => {
    expect(
      describeConnectionRejection(nodes, [], {
        source: "a",
        sourceHandle: "out:result",
        target: "b",
        targetHandle: "in:image_urls",
      }),
    ).toBeNull();
  });

  it.each([
    {
      scenario: "Insufficient credits (402)",
      err: new ApiError(402, "insufficient_credits", "Insufficient credits", {
        balance: 500_000,
        required: 1_720_000,
        displayM: { balance: 0.5, required: 1.72 },
      }),
      code: "insufficient_credits",
      messageIncludes: ["Insufficient credits", "1.72 M", "0.50 M"],
    },
    {
      scenario: "Generic run start error",
      err: new ApiError(403, "forbidden", "You do not own this workflow"),
      code: "forbidden",
      messageIncludes: ["You do not own this workflow"],
    },
  ])("$scenario → UI message", ({ err, code, messageIncludes }) => {
    const formatted = formatRunStartError(err);
    expect(formatted.code).toBe(code);
    for (const fragment of messageIncludes) {
      expect(formatted.message).toContain(fragment);
    }
  });

  it("partial failure: completed + failed chrome stay distinct", () => {
    const ok = canvasNodeStatusChrome("completed");
    const bad = canvasNodeStatusChrome("failed");
    expect(ok.dataStatus).toBe("completed");
    expect(bad.dataStatus).toBe("failed");
    expect(ok.rootClassName).toContain("border-[var(--success)]");
    expect(bad.rootClassName).toContain("border-[var(--danger)]");
    expect(ok.rootClassName).not.toBe(bad.rootClassName);
    // Neither collapses to a generic "success" when sibling fails.
    expect(ok.showBadge).toBe(true);
    expect(bad.showBadge).toBe(true);
  });

  it.each([
    ["idle", "border-[var(--border)]"],
    ["running", "border-[var(--accent-play)]"],
    ["completed", "border-[var(--success)]"],
    ["failed", "border-[var(--danger)]"],
  ] as const)("status mapping %s → %s", (status, borderToken) => {
    expect(canvasNodeStatusChrome(status).rootClassName).toContain(borderToken);
    expect(canvasNodeStatusChrome(status).dataStatus).toBe(status);
  });
});
