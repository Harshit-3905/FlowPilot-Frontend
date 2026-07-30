import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  cleanup,
  waitFor,
  screen,
  fireEvent,
  act,
} from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import {
  HistorySidebar,
  formatDuration,
  formatLogsBody,
  formatTimestamp,
  formatJsonSummary,
  hasLogEntries,
  nodeErrorMessage,
  normalizeLogEntries,
} from "./history-sidebar";
import {
  historyFixtures,
  historyHandlers,
  runDetailFixtures,
  workflowHandlers,
} from "@/test/msw-handlers";
import { RUN_SCOPE_LABELS, type RunScope } from "@/contracts";
import { useHistoryStore } from "@/store/history-store";
import { subscribeToRun } from "@/lib/subscribe-to-run";

const { mockGetToken } = vi.hoisted(() => ({
  mockGetToken: vi.fn(async () => "test-token"),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  closed = false;
  private readonly listeners = new Map<
    string,
    Set<(ev: MessageEvent) => void>
  >();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (ev: MessageEvent) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  close() {
    this.closed = true;
  }

  dispatch(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const server = setupServer(...workflowHandlers);

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
  mockGetToken.mockClear();
  useHistoryStore.getState().reset();
  FakeEventSource.instances = [];
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  server.close();
  cleanup();
  vi.unstubAllEnvs();
});

describe("formatDuration", () => {
  it("formats null and common durations", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(250)).toBe("250ms");
    expect(formatDuration(5000)).toBe("5.0s");
    expect(formatDuration(65_000)).toBe("1m 5s");
  });
});

describe("formatTimestamp", () => {
  it("returns a locale string for valid ISO", () => {
    const out = formatTimestamp("2026-07-30T10:00:00.000Z");
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toBe("2026-07-30T10:00:00.000Z");
  });
});

describe("HistorySidebar", () => {
  it("fetches runs for workflowId and renders status, timestamp, duration, scope", async () => {
    render(<HistorySidebar workflowId="wf_1" />);

    await waitFor(() =>
      expect(screen.getByTestId("history-list")).toBeInTheDocument(),
    );

    const completed = screen.getByTestId(
      `history-run-${historyFixtures.runs[0]!.id}`,
    );
    expect(completed).toHaveAttribute("data-status", "completed");
    expect(completed).toHaveAttribute("data-scope", "workflow");
    expect(
      completed.querySelector('[data-testid="history-run-status"]'),
    ).toHaveTextContent("completed");
    expect(
      completed.querySelector('[data-testid="history-run-scope"]'),
    ).toHaveTextContent("Workflow");
    expect(
      completed.querySelector('[data-testid="history-run-duration"]'),
    ).toHaveTextContent("5.0s");
    expect(
      completed.querySelector('[data-testid="history-run-timestamp"]'),
    ).toBeTruthy();

    const running = screen.getByTestId(
      `history-run-${historyFixtures.runs[1]!.id}`,
    );
    expect(running).toHaveAttribute("data-status", "running");
    expect(running).toHaveAttribute("data-scope", "node");
    expect(
      running.querySelector('[data-testid="history-run-duration"]'),
    ).toHaveTextContent("—");
    expect(
      running.querySelector('[data-testid="history-run-scope"]'),
    ).toHaveTextContent("Node");

    expect(screen.getByText(/History/)).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  it("renders product scope labels for each fixture scope (workflow | node)", async () => {
    render(<HistorySidebar workflowId="wf_1" />);

    await waitFor(() =>
      expect(screen.getByTestId("history-list")).toBeInTheDocument(),
    );

    const scopesSeen = new Set<RunScope>();
    for (const run of historyFixtures.runs) {
      scopesSeen.add(run.scope);
      const row = screen.getByTestId(`history-run-${run.id}`);
      expect(row).toHaveAttribute("data-scope", run.scope);
      expect(
        row.querySelector('[data-testid="history-run-scope"]'),
      ).toHaveTextContent(RUN_SCOPE_LABELS[run.scope]);
    }
    expect(scopesSeen.has("workflow")).toBe(true);
    expect(scopesSeen.has("node")).toBe(true);
  });

  it("clicking a run fetches detail and renders node status, timing, I/O, provider", async () => {
    render(<HistorySidebar workflowId="wf_1" />);

    await waitFor(() =>
      expect(screen.getByTestId("history-list")).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByTestId(`history-run-${historyFixtures.runs[0]!.id}`),
    );

    await waitFor(() =>
      expect(screen.getByTestId("run-detail")).toBeInTheDocument(),
    );

    const node = screen.getByTestId("run-detail-node-rn_hist_1a");
    expect(node).toHaveAttribute("data-status", "completed");
    expect(
      node.querySelector('[data-testid="run-detail-node-status"]'),
    ).toHaveTextContent("completed");
    expect(
      node.querySelector('[data-testid="run-detail-node-provider"]'),
    ).toHaveTextContent("stub");
    expect(
      node.querySelector('[data-testid="run-detail-node-time"]'),
    ).toHaveTextContent("3.0s");
    expect(
      node.querySelector('[data-testid="run-detail-node-cost"]'),
    ).toHaveTextContent("0.21 M");
    expect(
      node.querySelector('[data-testid="run-detail-node-input"]'),
    ).toHaveTextContent('"prompt"');
    expect(
      node.querySelector('[data-testid="run-detail-node-output"]'),
    ).toHaveTextContent("cat.png");
    expect(
      node.querySelector('[data-testid="run-detail-node-error"]'),
    ).toBeNull();
  });

  it("failed node shows error message slot", async () => {
    render(<HistorySidebar workflowId="wf_1" />);

    await waitFor(() =>
      expect(screen.getByTestId("history-list")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("history-run-run_hist_failed"));

    await waitFor(() =>
      expect(screen.getByTestId("run-detail-node-rn_fail_err")).toBeInTheDocument(),
    );

    const failed = screen.getByTestId("run-detail-node-rn_fail_err");
    expect(failed).toHaveAttribute("data-status", "failed");
    const errorSlot = failed.querySelector(
      '[data-testid="run-detail-node-error"]',
    );
    expect(errorSlot).toBeTruthy();
    expect(errorSlot).toHaveTextContent("All providers failed");
  });

  it("rich failure fixture shows attempts table, input, error, and expandable logs", async () => {
    render(<HistorySidebar workflowId="wf_1" />);

    await waitFor(() =>
      expect(screen.getByTestId("history-list")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("history-run-run_hist_failed"));

    await waitFor(() =>
      expect(screen.getByTestId("run-detail-node-rn_fail_err")).toBeInTheDocument(),
    );

    const failed = screen.getByTestId("run-detail-node-rn_fail_err");

    expect(
      failed.querySelector('[data-testid="run-detail-node-input"]'),
    ).toHaveTextContent('"prompt"');
    expect(
      failed.querySelector('[data-testid="run-detail-node-input"]'),
    ).toHaveTextContent("durationSec");

    expect(
      failed.querySelector('[data-testid="run-detail-node-error"]'),
    ).toHaveTextContent("All providers failed");

    const attempts = failed.querySelector(
      '[data-testid="run-detail-node-attempts"]',
    );
    expect(attempts).toBeTruthy();

    const attempt0 = screen.getByTestId("run-detail-attempt-0");
    expect(attempt0).toHaveAttribute("data-provider", "stub.kling_v3_pro");
    expect(attempt0).toHaveAttribute("data-outcome", "timeout");
    expect(
      attempt0.querySelector('[data-testid="run-detail-attempt-outcome"]'),
    ).toHaveTextContent("timeout");
    expect(screen.getByTestId("run-detail-attempt-0-time")).toHaveTextContent(
      "500ms",
    );
    expect(screen.getByTestId("run-detail-attempt-0-error")).toHaveTextContent(
      "Provider timed out waiting for webhook",
    );

    const attempt1 = screen.getByTestId("run-detail-attempt-1");
    expect(attempt1).toHaveAttribute("data-provider", "stub.kling_fallback");
    expect(attempt1).toHaveAttribute("data-outcome", "failed");
    expect(screen.getByTestId("run-detail-attempt-1-error")).toHaveTextContent(
      "Stub provider rejected request",
    );

    const logsPanel = screen.getByTestId("run-detail-node-logs");
    expect(logsPanel).toBeInTheDocument();
    expect(logsPanel).not.toHaveAttribute("open");
    expect(logsPanel).toHaveTextContent(/Logs \(4\)/);

    fireEvent.click(logsPanel.querySelector("summary")!);
    expect(logsPanel).toHaveAttribute("open");
    const logsBody = screen.getByTestId("run-detail-node-logs-body");
    expect(logsBody).toHaveTextContent("Trying provider stub.kling_v3_pro");
    expect(logsBody).toHaveTextContent("timed out");
    expect(logsBody).toHaveTextContent("Stub provider rejected request");

    // Successful prior node has no attempts / logs panels.
    const ok = screen.getByTestId("run-detail-node-rn_fail_ok");
    expect(
      ok.querySelector('[data-testid="run-detail-node-attempts"]'),
    ).toBeNull();
    expect(ok.querySelector('[data-testid="run-detail-node-logs"]')).toBeNull();
  });

  it("MSW historyHandlers serve GET /runs/:id rich failure fixture", async () => {
    const standalone = setupServer(...historyHandlers);
    standalone.listen({ onUnhandledRequest: "error" });
    try {
      const res = await fetch(
        "http://localhost:3001/api/v1/runs/run_hist_failed",
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as typeof runDetailFixtures.run_hist_failed;
      expect(body.nodes).toHaveLength(2);
      const failed = body.nodes[1]!;
      expect(failed.status).toBe("failed");
      expect(failed.error).toEqual({
        code: "PROVIDER_FAILED",
        message: "All providers failed",
      });
      expect(failed.attempts).toHaveLength(2);
      expect(failed.attempts[0]!.outcome).toBe("timeout");
      expect(failed.attempts[1]!.outcome).toBe("failed");
      expect(Array.isArray(failed.logs)).toBe(true);
      expect((failed.logs as unknown[]).length).toBe(4);
    } finally {
      standalone.close();
    }
  });

  it("shows empty state when there are no runs", async () => {
    server.use(
      http.get("http://localhost:3001/api/v1/workflows/:id/runs", () =>
        HttpResponse.json({ runs: [] }),
      ),
    );

    render(<HistorySidebar workflowId="wf_empty" />);

    await waitFor(() =>
      expect(screen.getByTestId("history-empty")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("history-empty")).toHaveTextContent(
      "No runs yet.",
    );
    expect(screen.queryByTestId("history-list")).not.toBeInTheDocument();
  });

  it("re-fetches when workflowId changes", async () => {
    const { rerender } = render(<HistorySidebar workflowId="wf_1" />);
    await waitFor(() =>
      expect(screen.getByTestId("history-list")).toBeInTheDocument(),
    );

    server.use(
      http.get("http://localhost:3001/api/v1/workflows/:id/runs", ({ params }) =>
        HttpResponse.json({
          runs:
            params.id === "wf_2"
              ? [
                  {
                    id: "run_wf2_only",
                    workflowId: "wf_2",
                    status: "failed",
                    scope: "workflow",
                    createdAt: "2026-07-30T11:00:00.000Z",
                    completedAt: "2026-07-30T11:00:02.000Z",
                    durationMs: 2000,
                  },
                ]
              : historyFixtures.runs,
        }),
      ),
    );

    rerender(<HistorySidebar workflowId="wf_2" />);

    await waitFor(() =>
      expect(screen.getByTestId("history-run-run_wf2_only")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("history-run-run_hist_1")).not.toBeInTheDocument();
  });

  it("MSW historyHandlers serve GET /workflows/:id/runs", async () => {
    const standalone = setupServer(...historyHandlers);
    standalone.listen({ onUnhandledRequest: "error" });
    try {
      const res = await fetch(
        "http://localhost:3001/api/v1/workflows/wf_1/runs",
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { runs: unknown[] };
      expect(body.runs).toHaveLength(3);
    } finally {
      standalone.close();
    }
  });

  it("subscribeToRun events update list + open detail without refresh", async () => {
    render(<HistorySidebar workflowId="wf_1" />);

    await waitFor(() =>
      expect(screen.getByTestId("history-list")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("history-run-run_hist_2"));

    await waitFor(() =>
      expect(screen.getByTestId("run-detail-node-rn_hist_2a")).toBeInTheDocument(),
    );

    expect(screen.getByTestId("history-run-run_hist_2")).toHaveAttribute(
      "data-status",
      "running",
    );
    expect(screen.getByTestId("run-detail-node-rn_hist_2a")).toHaveAttribute(
      "data-status",
      "running",
    );

    const { close } = subscribeToRun("run_hist_2", "tok_live", {
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      onEvent: (event) => {
        useHistoryStore.getState().applyRealtimeEvent(event);
      },
    });

    const source = FakeEventSource.instances[0]!;

    act(() => {
      source.dispatch("run.node.updated", {
        type: "run.node.updated",
        runId: "run_hist_2",
        nodeId: "node_1",
        status: "completed",
        partialOutput: { url: "https://cdn.example/live.png" },
        at: "2026-07-30T10:01:05.000Z",
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId("run-detail-node-rn_hist_2a")).toHaveAttribute(
        "data-status",
        "completed",
      ),
    );
    expect(
      screen
        .getByTestId("run-detail-node-rn_hist_2a")
        .querySelector('[data-testid="run-detail-node-output"]'),
    ).toHaveTextContent("live.png");

    const download = screen.getByTestId("run-detail-node-output-download-0");
    expect(download).toHaveAttribute("href", "https://cdn.example/live.png");
    expect(download).toHaveAttribute("download");
    expect(screen.getByTestId("run-detail-node-output-view-0")).toHaveAttribute(
      "href",
      "https://cdn.example/live.png",
    );

    act(() => {
      source.dispatch("run.completed", {
        type: "run.completed",
        runId: "run_hist_2",
        status: "completed",
        at: "2026-07-30T10:01:08.000Z",
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId("history-run-run_hist_2")).toHaveAttribute(
        "data-status",
        "completed",
      ),
    );
    expect(
      screen
        .getByTestId("history-run-run_hist_2")
        .querySelector('[data-testid="history-run-status"]'),
    ).toHaveTextContent("completed");

    close();
    expect(source.closed).toBe(true);
  });

  it("failed run still shows prior successful node output + download href", async () => {
    render(<HistorySidebar workflowId="wf_1" />);

    await waitFor(() =>
      expect(screen.getByTestId("history-list")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("history-run-run_hist_failed"));

    await waitFor(() =>
      expect(screen.getByTestId("run-detail-node-rn_fail_ok")).toBeInTheDocument(),
    );

    const ok = screen.getByTestId("run-detail-node-rn_fail_ok");
    expect(ok).toHaveAttribute("data-status", "completed");
    expect(
      ok.querySelector('[data-testid="run-detail-node-output"]'),
    ).toHaveTextContent("ok.png");
    expect(
      screen.getByTestId("run-detail-node-output-download-0"),
    ).toHaveAttribute("href", "https://cdn.example/ok.png");
    expect(screen.getByTestId("run-detail-node-rn_fail_err")).toHaveAttribute(
      "data-status",
      "failed",
    );
  });
});

describe("formatJsonSummary", () => {
  it("summarizes objects and null", () => {
    expect(formatJsonSummary(null)).toBe("—");
    expect(formatJsonSummary({ a: 1 })).toContain('"a"');
  });
});

describe("nodeErrorMessage", () => {
  it("extracts message from error objects", () => {
    expect(nodeErrorMessage(null)).toBeNull();
    expect(nodeErrorMessage({ message: "boom" })).toBe("boom");
    expect(nodeErrorMessage("raw")).toBe("raw");
  });
});

describe("hasLogEntries / normalizeLogEntries / formatLogsBody", () => {
  it("detects empty vs present logs", () => {
    expect(hasLogEntries(null)).toBe(false);
    expect(hasLogEntries([])).toBe(false);
    expect(hasLogEntries("")).toBe(false);
    expect(hasLogEntries([{ message: "x" }])).toBe(true);
    expect(hasLogEntries("line")).toBe(true);
  });

  it("formats structured log lines for the logs panel", () => {
    const logs = [
      {
        at: "2026-07-30T10:02:01.500Z",
        level: "info",
        message: "Trying provider stub.a",
        providerId: "stub.a",
      },
      {
        at: "2026-07-30T10:02:02.000Z",
        level: "error",
        message: "timed out",
        providerId: "stub.a",
      },
    ];
    expect(normalizeLogEntries(logs)).toHaveLength(2);
    const body = formatLogsBody(logs);
    expect(body).toContain("INFO");
    expect(body).toContain("[stub.a]");
    expect(body).toContain("Trying provider stub.a");
    expect(body).toContain("ERROR");
    expect(body).toContain("timed out");
  });
});
