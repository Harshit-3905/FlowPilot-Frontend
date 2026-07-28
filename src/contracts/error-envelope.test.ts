import { describe, expect, it } from "vitest";
import { ErrorEnvelopeSchema } from "./error-envelope";

describe("ErrorEnvelopeSchema", () => {
  it("parses a valid envelope", () => {
    const parsed = ErrorEnvelopeSchema.parse({
      code: "UNAUTHORIZED",
      message: "Missing or invalid token",
    });
    expect(parsed.code).toBe("UNAUTHORIZED");
    expect(parsed.message).toBe("Missing or invalid token");
  });

  it("allows optional details", () => {
    const parsed = ErrorEnvelopeSchema.parse({
      code: "VALIDATION_ERROR",
      message: "Invalid body",
      details: { field: "email" },
    });
    expect(parsed.details).toEqual({ field: "email" });
  });
});
