import { z } from "zod";

/** `GET /api/v1/me` success body. */
export const MeResponseSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
