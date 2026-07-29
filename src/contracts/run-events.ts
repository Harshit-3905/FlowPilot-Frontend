import { z } from "zod";

const RunNodeStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const RunStartedEventSchema = z.object({
  type: z.literal("run.started"),
  runId: z.string().min(1),
  workflowId: z.string().min(1),
  scope: z.enum(["workflow", "node"]),
  at: z.string().datetime(),
});

export type RunStartedEvent = z.infer<typeof RunStartedEventSchema>;

export const RunNodeUpdatedEventSchema = z.object({
  type: z.literal("run.node.updated"),
  runId: z.string().min(1),
  nodeId: z.string().min(1),
  status: RunNodeStatusSchema,
  partialOutput: z.unknown().optional(),
  error: z.unknown().nullable().optional(),
  at: z.string().datetime(),
});

export type RunNodeUpdatedEvent = z.infer<typeof RunNodeUpdatedEventSchema>;

export const RunCompletedEventSchema = z.object({
  type: z.literal("run.completed"),
  runId: z.string().min(1),
  status: z.literal("completed"),
  summary: z.string().optional(),
  at: z.string().datetime(),
});

export type RunCompletedEvent = z.infer<typeof RunCompletedEventSchema>;

export const RunFailedEventSchema = z.object({
  type: z.literal("run.failed"),
  runId: z.string().min(1),
  status: z.literal("failed"),
  summary: z.string().optional(),
  error: z.unknown().nullable().optional(),
  at: z.string().datetime(),
});

export type RunFailedEvent = z.infer<typeof RunFailedEventSchema>;

export const RunRealtimeEventSchema = z.discriminatedUnion("type", [
  RunStartedEventSchema,
  RunNodeUpdatedEventSchema,
  RunCompletedEventSchema,
  RunFailedEventSchema,
]);

export type RunRealtimeEvent = z.infer<typeof RunRealtimeEventSchema>;

export const SubscribeResponseSchema = z.object({
  token: z.string().min(1),
  channel: z.string().min(1),
  expiresAt: z.string().datetime(),
});

export type SubscribeResponse = z.infer<typeof SubscribeResponseSchema>;
