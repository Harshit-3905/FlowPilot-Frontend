import { z } from "zod";

export const RunStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export type RunStatus = z.infer<typeof RunStatusSchema>;

/**
 * Full DAG vs single-node run (matches realtime `run.started` scope).
 * Selected-group / subgraph runs are not supported yet — keep `workflow` | `node` only
 * until product + create-run + Prisma add `group`.
 */
export const RunScopeSchema = z.enum(["workflow", "node"]);

export type RunScope = z.infer<typeof RunScopeSchema>;

/** History sidebar scope copy (Galaxy/Magica: Workflow | Node). */
export const RUN_SCOPE_LABELS = {
  workflow: "Workflow",
  node: "Node",
} as const satisfies Record<RunScope, string>;

export function runScopeLabel(scope: RunScope): string {
  return RUN_SCOPE_LABELS[scope];
}

export const StartNodeRunBodySchema = z.object({
  workflowId: z.string().min(1),
  nodeId: z.string().min(1),
});

export type StartNodeRunBody = z.infer<typeof StartNodeRunBodySchema>;

export const StartWorkflowRunResponseSchema = z.object({
  runId: z.string().min(1),
});

export type StartWorkflowRunResponse = z.infer<
  typeof StartWorkflowRunResponseSchema
>;

/** Per-provider try outcome (matches Prisma AttemptOutcome). */
export const AttemptOutcomeSchema = z.enum(["success", "failed", "timeout"]);

export type AttemptOutcome = z.infer<typeof AttemptOutcomeSchema>;

/** One provider try within a RunNode (failover chain / history debug). */
export const RunNodeAttemptSchema = z.object({
  id: z.string().optional(),
  providerId: z.string().min(1),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  error: z.unknown().nullable().optional(),
  outcome: AttemptOutcomeSchema,
});

export type RunNodeAttempt = z.infer<typeof RunNodeAttemptSchema>;

export const RunNodeDetailSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: RunStatusSchema,
  input: z.unknown().nullable(),
  output: z.unknown().nullable(),
  error: z.unknown().nullable(),
  /** 1-based count of provider tries performed (last attempt index). */
  attempt: z.number().int().positive(),
  /** Ordered provider tries (empty until execution records them). */
  attempts: z.array(RunNodeAttemptSchema).default([]),
  /** Structured per-node logs for history/debug UI. */
  logs: z.unknown().nullable().optional(),
  /** Actual cost in microcredits; null until node completes (or never ran). */
  costCredits: z.number().int().nonnegative().nullable(),
  /** Convenience M units (= costCredits / 1e6) when cost is present. */
  costDisplayM: z.number().optional(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});

export type RunNodeDetail = z.infer<typeof RunNodeDetailSchema>;

export const RunDetailSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: RunStatusSchema,
  triggerRunId: z.string().nullable(),
  error: z.unknown().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

export type RunDetail = z.infer<typeof RunDetailSchema>;

export const RunDetailResponseSchema = z.object({
  run: RunDetailSchema,
  nodes: z.array(RunNodeDetailSchema),
});

export type RunDetailResponse = z.infer<typeof RunDetailResponseSchema>;

/**
 * History sidebar list entry: timestamp + status + duration + scope (+ ids).
 * `createdAt` is the list timestamp; `durationMs` when the run has completedAt.
 */
export const RunHistoryEntrySchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: RunStatusSchema,
  scope: RunScopeSchema,
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
});

export type RunHistoryEntry = z.infer<typeof RunHistoryEntrySchema>;

export const RunHistoryListResponseSchema = z.object({
  runs: z.array(RunHistoryEntrySchema),
});

export type RunHistoryListResponse = z.infer<
  typeof RunHistoryListResponseSchema
>;
