import { z } from "zod";

/**
 * Outbound webhook event types (public API / Mintlify).
 * Distinct from realtime `run.node.updated` — only completed nodes emit `node.completed`.
 */
export const WebhookEventTypeSchema = z.enum([
  "run.started",
  "run.completed",
  "run.failed",
  "node.completed",
]);

export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

export const ALL_WEBHOOK_EVENT_TYPES: readonly WebhookEventType[] =
  WebhookEventTypeSchema.options;

export const WebhookRunStartedPayloadSchema = z.object({
  type: z.literal("run.started"),
  runId: z.string().min(1),
  workflowId: z.string().min(1),
  scope: z.enum(["workflow", "node"]),
  at: z.string().datetime(),
});

export type WebhookRunStartedPayload = z.infer<
  typeof WebhookRunStartedPayloadSchema
>;

export const WebhookRunCompletedPayloadSchema = z.object({
  type: z.literal("run.completed"),
  runId: z.string().min(1),
  status: z.literal("completed"),
  summary: z.string().optional(),
  at: z.string().datetime(),
});

export type WebhookRunCompletedPayload = z.infer<
  typeof WebhookRunCompletedPayloadSchema
>;

export const WebhookRunFailedPayloadSchema = z.object({
  type: z.literal("run.failed"),
  runId: z.string().min(1),
  status: z.literal("failed"),
  summary: z.string().optional(),
  error: z.unknown().nullable().optional(),
  at: z.string().datetime(),
});

export type WebhookRunFailedPayload = z.infer<
  typeof WebhookRunFailedPayloadSchema
>;

export const WebhookNodeCompletedPayloadSchema = z.object({
  type: z.literal("node.completed"),
  runId: z.string().min(1),
  nodeId: z.string().min(1),
  status: z.literal("completed"),
  output: z.unknown().optional(),
  at: z.string().datetime(),
});

export type WebhookNodeCompletedPayload = z.infer<
  typeof WebhookNodeCompletedPayloadSchema
>;

export const WebhookPayloadSchema = z.discriminatedUnion("type", [
  WebhookRunStartedPayloadSchema,
  WebhookRunCompletedPayloadSchema,
  WebhookRunFailedPayloadSchema,
  WebhookNodeCompletedPayloadSchema,
]);

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

/** Nested Magica/Galaxy-style webhook config on public start. */
export const StartPublicRunWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(WebhookEventTypeSchema).min(1).optional(),
});

export type StartPublicRunWebhook = z.infer<typeof StartPublicRunWebhookSchema>;
