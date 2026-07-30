import { z } from "zod";

/** `POST /api/v1/api-keys` body. */
export const CreateApiKeyBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type CreateApiKeyBody = z.infer<typeof CreateApiKeyBodySchema>;

/**
 * `POST /api/v1/api-keys` success — full `key` returned **once**.
 * Never returned again on list/get.
 */
export const CreateApiKeyResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Raw Bearer secret — show once in UI then discard. */
  key: z.string().min(1),
  /** Short prefix for masked display (same as list `prefix`). */
  prefix: z.string().min(1),
});

export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>;

/** One row in `GET /api/v1/api-keys` — never includes full key. */
export const ApiKeyListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  prefix: z.string().min(1),
  createdAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
});

export type ApiKeyListItem = z.infer<typeof ApiKeyListItemSchema>;

/** `GET /api/v1/api-keys` success body. */
export const ApiKeyListResponseSchema = z.object({
  keys: z.array(ApiKeyListItemSchema),
});

export type ApiKeyListResponse = z.infer<typeof ApiKeyListResponseSchema>;

/** `DELETE /api/v1/api-keys/:id` success body. */
export const RevokeApiKeyResponseSchema = z.object({
  id: z.string().min(1),
  revokedAt: z.string().datetime(),
});

export type RevokeApiKeyResponse = z.infer<typeof RevokeApiKeyResponseSchema>;
