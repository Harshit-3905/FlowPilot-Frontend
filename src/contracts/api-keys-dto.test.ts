import { describe, expect, it } from "vitest";
import {
  ApiKeyListResponseSchema,
  CreateApiKeyBodySchema,
  CreateApiKeyResponseSchema,
  RevokeApiKeyResponseSchema,
} from "./api-keys-dto";

describe("api-keys-dto", () => {
  it("create body trims name and rejects empty", () => {
    expect(CreateApiKeyBodySchema.parse({ name: "  Prod  " })).toEqual({
      name: "Prod",
    });
    expect(CreateApiKeyBodySchema.safeParse({ name: "  " }).success).toBe(
      false,
    );
  });

  it("create response requires full key once", () => {
    const parsed = CreateApiKeyResponseSchema.parse({
      id: "key_1",
      name: "Prod",
      key: "fp_secret_full",
      prefix: "fp_secre",
    });
    expect(parsed.key).toBe("fp_secret_full");
  });

  it("list response never requires a key field", () => {
    const parsed = ApiKeyListResponseSchema.parse({
      keys: [
        {
          id: "key_1",
          name: "Prod",
          prefix: "fp_secre",
          createdAt: "2026-07-30T12:00:00.000Z",
          revokedAt: null,
        },
      ],
    });
    expect(parsed.keys[0]).not.toHaveProperty("key");
  });

  it("revoke response includes revokedAt", () => {
    const parsed = RevokeApiKeyResponseSchema.parse({
      id: "key_1",
      revokedAt: "2026-07-30T12:01:00.000Z",
    });
    expect(parsed.revokedAt).toBe("2026-07-30T12:01:00.000Z");
  });
});
