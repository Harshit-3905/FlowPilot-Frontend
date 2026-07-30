import { describe, expect, it } from "vitest";
import { formatDisplayM, toDisplayM } from "./format-credits";

describe("formatDisplayM", () => {
  it("formats two decimal places like Est/Bal chrome", () => {
    expect(formatDisplayM(1.72)).toBe("1.72");
    expect(formatDisplayM(0)).toBe("0.00");
    expect(formatDisplayM(10)).toBe("10.00");
  });
});

describe("toDisplayM", () => {
  it("prefers displayM when present", () => {
    expect(toDisplayM(10, 10_000_000)).toBe(10);
  });

  it("divides microcredits when displayM omitted", () => {
    expect(toDisplayM(undefined, 1_720_000)).toBe(1.72);
  });
});
