import { z } from "zod";

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

export const RunNodeDetailSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  input: z.unknown().nullable(),
  output: z.unknown().nullable(),
  error: z.unknown().nullable(),
  attempt: z.number().int().positive(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});

export type RunNodeDetail = z.infer<typeof RunNodeDetailSchema>;

export const RunDetailSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
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
