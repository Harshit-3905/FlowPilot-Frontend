import { z } from "zod";
import type { NodeDefinition } from "../node-definition";

/**
 * Response — I/O sink node (`response`).
 * Shaped from fixture `AI_Racing_Car_Generator_Copy.json`,
 * shot `Seedance_2.0_image_to_video_plus_Response.png`, and inventory.
 *
 * Target handle is bare `result` (no `in:` prefix — product export).
 * UI slots are runtime-keyed by upstream node type ids (gpt_image_2, …).
 * Adapter is a passthrough stub.
 */

export const ResponseInputSchema = z.object({
  result: z.unknown().nullable().default(null),
});

export type ResponseInput = z.infer<typeof ResponseInputSchema>;

export const ResponseOutputSchema = z.object({
  result: z.unknown().nullable().default(null),
});

export type ResponseOutput = z.infer<typeof ResponseOutputSchema>;

export function estimateResponseCredits(_input?: unknown): number {
  return 0;
}

export const responseDefinition = {
  type: "response",
  label: "Response",
  category: "io",
  input: ResponseInputSchema,
  output: ResponseOutputSchema,
  credits: { static: 0 },
  provider: { kind: "stub" as const, adapterId: "stub.response" },
  ui: {
    /** Slots are runtime UI; no static settings. */
    fields: [],
    handles: {
      inputs: [
        {
          id: "result",
          label: "result",
          dataType: "any",
        },
      ],
      outputs: [],
    },
  },
} satisfies NodeDefinition;
