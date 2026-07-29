import {
  RunDetailResponseSchema,
  StartWorkflowRunResponseSchema,
  SubscribeResponseSchema,
} from "@/contracts";
import { apiFetch, type GetToken } from "@/lib/api-client";
import { subscribeToRun, type SubscribeToRunOptions } from "@/lib/subscribe-to-run";

export type StartRunOptions = {
  getToken: GetToken;
  baseUrl?: string;
  fetch?: typeof fetch;
};

/**
 * Start a full workflow run. FE never talks to Trigger.dev — REST only.
 */
export async function startWorkflowRun(
  workflowId: string,
  options: StartRunOptions,
): Promise<{ runId: string }> {
  return apiFetch(`/api/v1/workflows/${workflowId}/runs`, {
    getToken: options.getToken,
    baseUrl: options.baseUrl,
    fetch: options.fetch,
    method: "POST",
    schema: StartWorkflowRunResponseSchema,
  });
}

/**
 * Start a single-node test run. Returns the created run id.
 */
export async function startNodeRun(
  body: { workflowId: string; nodeId: string },
  options: StartRunOptions,
): Promise<{ runId: string }> {
  const detail = await apiFetch("/api/v1/runs/node", {
    getToken: options.getToken,
    baseUrl: options.baseUrl,
    fetch: options.fetch,
    method: "POST",
    body,
    schema: RunDetailResponseSchema,
  });
  return { runId: detail.run.id };
}

/**
 * Optional post-start subscribe: Clerk → short-lived token → EventSource.
 * History UI is doc 07; this only keeps the SSE channel alive / logs.
 */
export async function subscribeAfterStart(
  runId: string,
  options: StartRunOptions & SubscribeToRunOptions,
): Promise<{ close: () => void }> {
  const sub = await apiFetch(`/api/v1/runs/${runId}/subscribe`, {
    getToken: options.getToken,
    baseUrl: options.baseUrl,
    fetch: options.fetch,
    method: "POST",
    schema: SubscribeResponseSchema,
  });
  return subscribeToRun(runId, sub.token, {
    baseUrl: options.baseUrl,
    onEvent: options.onEvent,
    log: options.log,
    EventSourceImpl: options.EventSourceImpl,
  });
}
