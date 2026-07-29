import { beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeToRun } from "./subscribe-to-run";
import type { RunRealtimeEvent } from "@/contracts";

class FakeEventSource {
  static lastUrl: string | null = null;
  static instances: FakeEventSource[] = [];

  readonly url: string;
  closed = false;
  private readonly listeners = new Map<string, Set<(ev: MessageEvent) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.lastUrl = url;
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

describe("subscribeToRun", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
    FakeEventSource.lastUrl = null;
    FakeEventSource.instances = [];
  });

  it("opens SSE URL with token and forwards parsed events", () => {
    const events: RunRealtimeEvent[] = [];
    const { close } = subscribeToRun("run_1", "tok_abc", {
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      onEvent: (event) => {
        events.push(event);
      },
    });

    expect(FakeEventSource.lastUrl).toBe(
      "http://localhost:3001/api/v1/runs/run_1/events?token=tok_abc",
    );

    const source = FakeEventSource.instances[0]!;
    source.dispatch("run.started", {
      type: "run.started",
      runId: "run_1",
      workflowId: "wf_1",
      scope: "node",
      at: "2026-07-29T12:00:00.000Z",
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("run.started");

    close();
    expect(source.closed).toBe(true);
  });

  it("ignores malformed payloads", () => {
    const events: RunRealtimeEvent[] = [];
    subscribeToRun("run_1", "tok", {
      EventSourceImpl: FakeEventSource as unknown as typeof EventSource,
      onEvent: (event) => {
        events.push(event);
      },
    });

    FakeEventSource.instances[0]!.dispatch("message", { type: "nope" });
    expect(events).toHaveLength(0);
  });
});
