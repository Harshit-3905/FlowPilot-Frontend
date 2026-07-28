import {
  ErrorEnvelopeSchema,
  MeResponseSchema,
  type MeResponse,
} from "@/contracts";

export type GetToken = () => Promise<string | null>;

export type ApiClientOptions = {
  /** Absolute backend origin, e.g. `http://localhost:3001`. */
  baseUrl?: string;
  getToken: GetToken;
  fetch?: typeof fetch;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function resolveBaseUrl(explicit?: string): string {
  const base = explicit ?? process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return base.replace(/\/$/, "");
}

/**
 * Typed fetch wrapper: attaches `Authorization: Bearer <session JWT>` when
 * `getToken()` returns a value. Targets the split-VPC backend origin.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiClientOptions & {
    schema: { parse: (data: unknown) => T };
    method?: string;
    body?: unknown;
  },
): Promise<T> {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const token = await options.getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const doFetch = options.fetch ?? fetch;
  const res = await doFetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const envelope = ErrorEnvelopeSchema.safeParse(json);
    if (envelope.success) {
      throw new ApiError(
        res.status,
        envelope.data.code,
        envelope.data.message,
        envelope.data.details,
      );
    }
    throw new ApiError(res.status, "http_error", `Request failed (${res.status})`);
  }

  return options.schema.parse(json);
}

export function fetchMe(options: ApiClientOptions): Promise<MeResponse> {
  return apiFetch("/api/v1/me", {
    ...options,
    schema: MeResponseSchema,
  });
}
