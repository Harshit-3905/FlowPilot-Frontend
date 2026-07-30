import { describe, expect, it } from "vitest";
import {
  canvasNodeStatusChrome,
  type CanvasNodeStatus,
} from "./canvas-node-status";

describe("canvasNodeStatusChrome", () => {
  it("maps idle → default border, no badge, data-status idle", () => {
    const chrome = canvasNodeStatusChrome("idle");
    expect(chrome.dataStatus).toBe("idle");
    expect(chrome.rootClassName).toContain("border-[var(--border)]");
    expect(chrome.rootClassName).not.toContain("flow-node--status-running");
    expect(chrome.showBadge).toBe(false);
    expect(chrome.badgeClassName).toBe("");
  });

  it("maps running → accent border + pulse class, distinct from idle", () => {
    const chrome = canvasNodeStatusChrome("running");
    expect(chrome.dataStatus).toBe("running");
    expect(chrome.rootClassName).toContain("border-[var(--accent-play)]");
    expect(chrome.rootClassName).toContain("flow-node--status-running");
    expect(chrome.showBadge).toBe(true);
    expect(chrome.badgeClassName).toContain("text-[var(--accent-play)]");
  });

  it("maps completed → success tokens", () => {
    const chrome = canvasNodeStatusChrome("completed");
    expect(chrome.dataStatus).toBe("completed");
    expect(chrome.rootClassName).toContain("border-[var(--success)]");
    expect(chrome.badgeClassName).toContain("text-[var(--success)]");
    expect(chrome.showBadge).toBe(true);
  });

  it("maps failed → danger tokens", () => {
    const chrome = canvasNodeStatusChrome("failed");
    expect(chrome.dataStatus).toBe("failed");
    expect(chrome.rootClassName).toContain("border-[var(--danger)]");
    expect(chrome.badgeClassName).toContain("text-[var(--danger)]");
    expect(chrome.showBadge).toBe(true);
  });

  it("running is visually distinct from completed and failed", () => {
    const running = canvasNodeStatusChrome("running");
    const completed = canvasNodeStatusChrome("completed");
    const failed = canvasNodeStatusChrome("failed");
    expect(running.rootClassName).not.toBe(completed.rootClassName);
    expect(running.rootClassName).not.toBe(failed.rootClassName);
    expect(running.rootClassName).toContain("flow-node--status-running");
    expect(completed.rootClassName).not.toContain("flow-node--status-running");
    expect(failed.rootClassName).not.toContain("flow-node--status-running");
  });

  it.each([
    ["queued", true],
    ["cancelled", true],
  ] as const satisfies ReadonlyArray<readonly [CanvasNodeStatus, boolean]>)(
    "maps %s → muted badge, default border",
    (status, showBadge) => {
      const chrome = canvasNodeStatusChrome(status);
      expect(chrome.dataStatus).toBe(status);
      expect(chrome.rootClassName).toContain("border-[var(--border)]");
      expect(chrome.showBadge).toBe(showBadge);
      expect(chrome.badgeClassName).toContain("text-[var(--text-muted)]");
    },
  );
});
