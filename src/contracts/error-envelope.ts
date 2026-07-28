import { z } from "zod";

export const ErrorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
