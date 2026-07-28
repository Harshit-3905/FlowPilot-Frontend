import { describe, expect, it } from "vitest";
import { MeResponseSchema } from "./me";

describe("MeResponseSchema", () => {
  it("accepts id + nullable email", () => {
    expect(
      MeResponseSchema.parse({ id: "cuid_1", email: "a@b.co" }),
    ).toEqual({ id: "cuid_1", email: "a@b.co" });
    expect(MeResponseSchema.parse({ id: "cuid_2", email: null })).toEqual({
      id: "cuid_2",
      email: null,
    });
  });

  it("rejects missing id", () => {
    expect(() => MeResponseSchema.parse({ email: null })).toThrow();
  });
});
