import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError, apiFetch, fetchMe } from "./api-client";
import { MeResponseSchema } from "@/contracts";

describe("apiFetch / fetchMe", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
  });

  it("attaches Authorization Bearer from getToken", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "u1", email: "a@b.co" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await fetchMe({
      getToken: async () => "test-jwt-token",
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result).toEqual({ id: "u1", email: "a@b.co" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-jwt-token",
        }),
      }),
    );
  });

  it("omits Authorization when getToken returns null", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "u1", email: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await apiFetch("/api/v1/me", {
      getToken: async () => null,
      fetch: fetchMock as unknown as typeof fetch,
      schema: MeResponseSchema,
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("throws ApiError from error envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ code: "unauthorized", message: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      fetchMe({
        getToken: async () => "bad",
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      code: "unauthorized",
      message: "Invalid token",
    } satisfies Partial<ApiError>);
  });

  it("parses 204 No Content as null", async () => {
    const { z } = await import("zod");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    const result = await apiFetch("/api/v1/workflows/wf_1", {
      getToken: async () => "tok",
      fetch: fetchMock as unknown as typeof fetch,
      method: "DELETE",
      schema: z.null(),
    });

    expect(result).toBeNull();
  });
});
