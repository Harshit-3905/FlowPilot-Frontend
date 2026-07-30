import { z } from "zod";
import { RunDetailSchema, RunNodeDetailSchema } from "./run-dto";
import {
  StartPublicRunWebhookSchema,
  WebhookEventTypeSchema,
  type WebhookEventType,
} from "./webhook-dto";

/**
 * Public `POST /api/v1/public/runs` body.
 * Magica/Galaxy API tab: `{ workflowId, webhook? }` → `{ runId }`.
 * Prefer nested `webhook`; flat `webhookUrl` is an accepted alias.
 */
export const StartPublicRunBodySchema = z
  .object({
    workflowId: z.string().min(1),
    webhookUrl: z.string().url().optional(),
    webhook: StartPublicRunWebhookSchema.optional(),
  })
  .superRefine((body, ctx) => {
    if (body.webhook && body.webhookUrl && body.webhook.url !== body.webhookUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "webhook.url and webhookUrl must match when both are set",
        path: ["webhookUrl"],
      });
    }
  });

export type StartPublicRunBody = z.infer<typeof StartPublicRunBodySchema>;

/** Resolve outbound webhook target from a validated public start body. */
export function resolvePublicRunWebhook(body: StartPublicRunBody): {
  url: string;
  events: WebhookEventType[] | null;
} | null {
  if (body.webhook) {
    return {
      url: body.webhook.url,
      events: body.webhook.events ?? null,
    };
  }
  if (body.webhookUrl) {
    return { url: body.webhookUrl, events: null };
  }
  return null;
}

export { WebhookEventTypeSchema };

/**
 * Public poll without `inDetails=true`: status only (no per-node payload).
 * With `inDetails=true` use {@link PublicRunDetailResponseSchema}.
 */
export const PublicRunStatusResponseSchema = z.object({
  run: RunDetailSchema,
});

export type PublicRunStatusResponse = z.infer<
  typeof PublicRunStatusResponseSchema
>;

/**
 * Public poll with `?inDetails=true`.
 * Same shape as Clerk run detail (`nodes[]`); Galaxy docs say `nodeRuns[]` —
 * we keep `nodes` for FE/BE contract parity (logged in decision-log).
 */
export const PublicRunDetailResponseSchema = z.object({
  run: RunDetailSchema,
  nodes: z.array(RunNodeDetailSchema),
});

export type PublicRunDetailResponse = z.infer<
  typeof PublicRunDetailResponseSchema
>;
