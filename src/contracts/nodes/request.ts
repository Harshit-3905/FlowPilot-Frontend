import { z } from "zod";
import type { NodeDefinition } from "../node-definition";

/**
 * Request Inputs — I/O source node (`request`).
 * Shaped from fixture `AI_Racing_Car_Generator_Copy.json` +
 * `docs/reference/node-inventory.md`.
 *
 * Runtime: `node.data.dynamicFields` drives Playground inputs and
 * source handles `field_<id>` (not static `out:` handles).
 * Adapter is a passthrough stub that maps fields → output record.
 */

export const RequestDynamicFieldSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().default("text"),
  value: z.string().default(""),
});

export type RequestDynamicField = z.infer<typeof RequestDynamicFieldSchema>;

export const RequestInputSchema = z.object({
  dynamicFields: z.array(RequestDynamicFieldSchema).default([]),
});

export type RequestInput = z.infer<typeof RequestInputSchema>;

/** field id → value for downstream / playground wiring. */
export const RequestOutputSchema = z.object({
  fields: z.record(z.string(), z.string()).default({}),
});

export type RequestOutput = z.infer<typeof RequestOutputSchema>;

export function estimateRequestCredits(_input?: unknown): number {
  return 0;
}

export const requestDefinition = {
  type: "request",
  label: "Request Inputs",
  category: "io",
  input: RequestInputSchema,
  output: RequestOutputSchema,
  credits: { static: 0 },
  provider: { kind: "stub" as const, adapterId: "stub.request" },
  ui: {
    /** Static settings empty — fields come from `dynamicFields` at runtime. */
    fields: [],
    handles: {
      inputs: [],
      /** `field_<id>` source handles are emitted from dynamicFields at runtime. */
      outputs: [],
    },
  },
} satisfies NodeDefinition;
