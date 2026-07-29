import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Node } from "@xyflow/react";
import { useEditorStore } from "@/store/editor-store";

vi.mock("@xyflow/react", () => ({
  applyNodeChanges: vi.fn((_c: unknown[], n: unknown[]) => n),
  applyEdgeChanges: vi.fn((_c: unknown[], e: unknown[]) => e),
}));

const mockFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.useFakeTimers();
  useEditorStore.setState({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } });
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ id: "wf1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe("auto-save debounce logic", () => {
  it("debounces multiple rapid changes into one PATCH", async () => {
    const { useAutoSave } = await import("./use-auto-save");
    const getToken = vi.fn().mockResolvedValue("tok");

    const { renderHook, act } = await import("@testing-library/react");
    const { result, unmount } = renderHook(() => useAutoSave("wf1", getToken, 500));

    expect(result.current).toBe("idle");

    const nodeA: Node = { id: "a", type: "t", position: { x: 1, y: 1 }, data: {} };
    const nodeB: Node = { id: "b", type: "t", position: { x: 2, y: 2 }, data: {} };
    const nodeC: Node = { id: "c", type: "t", position: { x: 3, y: 3 }, data: {} };

    act(() => {
      useEditorStore.setState({ nodes: [nodeA] });
    });
    act(() => {
      useEditorStore.setState({ nodes: [nodeB] });
    });
    act(() => {
      useEditorStore.setState({ nodes: [nodeC] });
    });

    // Before debounce fires — no fetch yet
    expect(mockFetch).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/api/v1/workflows/wf1");
    expect(init?.method).toBe("PATCH");
    const body = JSON.parse(init?.body as string);
    expect(body.graph.nodes).toHaveLength(1);
    expect(body.graph.nodes[0].id).toBe("c");
    unmount();
  });

  it("does not PATCH if state unchanged", async () => {
    const { useAutoSave } = await import("./use-auto-save");
    const getToken = vi.fn().mockResolvedValue("tok");

    const { renderHook, act } = await import("@testing-library/react");
    const { unmount } = renderHook(() => useAutoSave("wf1", getToken, 500));

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    unmount();
  });
});
