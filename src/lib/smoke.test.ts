import { describe, expect, it } from "vitest";
import { assertSmoke } from "./smoke";

describe("frontend smoke", () => {
  it("passes", () => {
    expect(assertSmoke()).toBe(true);
  });
});
