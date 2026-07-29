import {
  RunRealtimeEventSchema,
  type RunRealtimeEvent,
} from "@/contracts";

export type SubscribeToRunOptions = {
  /** Absolute backend origin, e.g. `http://localhost:3001`. */
  baseUrl?: string;
  onEvent?: (event: RunRealtimeEvent) => void;
  /** Defaults to `console.log` when `onEvent` is omitted. */
  log?: (message: string, event: RunRealtimeEvent) => void;
  /** Injectable for tests (jsdom may lack EventSource). */
  EventSourceImpl?: new (
    url: string,
    eventSourceInitDict?: EventSourceInit,
  ) => EventSource;
};

function resolveBaseUrl(explicit?: string): string {
  const base = explicit ?? process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return base.replace(/\/$/, "");
}

/**
 * Thin SSE client for run realtime events (doc 05 Slice 7).
 * Full history UI is doc 07 — this only parses + logs / forwards events.
 */
export function subscribeToRun(
  runId: string,
  token: string,
  options: SubscribeToRunOptions = {},
): { close: () => void } {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const url = `${baseUrl}/api/v1/runs/${encodeURIComponent(runId)}/events?token=${encodeURIComponent(token)}`;

  const EventSourceCtor =
    options.EventSourceImpl ??
    (globalThis.EventSource as
      | (new (url: string, init?: EventSourceInit) => EventSource)
      | undefined);

  if (!EventSourceCtor) {
    throw new Error("EventSource is not available in this environment");
  }

  const source = new EventSourceCtor(url);
  const log =
    options.log ??
    ((message: string, event: RunRealtimeEvent) => {
      console.log(message, event);
    });

  const handleMessage = (raw: MessageEvent) => {
    let data: unknown;
    try {
      data = JSON.parse(String(raw.data));
    } catch {
      return;
    }
    const parsed = RunRealtimeEventSchema.safeParse(data);
    if (!parsed.success) {
      return;
    }
    options.onEvent?.(parsed.data);
    if (!options.onEvent) {
      log(`[run ${runId}] ${parsed.data.type}`, parsed.data);
    }
  };

  source.addEventListener("message", handleMessage);
  for (const type of [
    "run.started",
    "run.node.updated",
    "run.completed",
    "run.failed",
  ] as const) {
    source.addEventListener(type, handleMessage);
  }

  return {
    close: () => {
      source.close();
    },
  };
}
