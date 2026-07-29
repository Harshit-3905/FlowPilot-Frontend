import { describe, expect, it } from "vitest";
import { estimateCredits } from "./estimate-credits";
import { estimateGptImage2Credits } from "./nodes/gpt-image-2";

describe("estimateCredits", () => {
  it("returns deterministic gpt_image_2 estimates for sample inputs", () => {
    expect(estimateCredits("gpt_image_2", {})).toBe(0.21);
    expect(
      estimateCredits("gpt_image_2", { quality: "High", n: 1 }),
    ).toBe(0.21);
    expect(
      estimateCredits("gpt_image_2", { quality: "High", n: 2 }),
    ).toBe(0.42);
    expect(
      estimateCredits("gpt_image_2", { quality: "Medium", n: 1 }),
    ).toBe(0.14);
    expect(
      estimateCredits("gpt_image_2", { quality: "Low", n: 3 }),
    ).toBe(0.21);
    expect(
      estimateCredits("gpt_image_2", { quality: "Auto", n: 1 }),
    ).toBe(0.21);
  });

  it("matches estimateGptImage2Credits for the same input", () => {
    const input = { quality: "Medium", n: 4 };
    expect(estimateCredits("gpt_image_2", input)).toBe(
      estimateGptImage2Credits(input),
    );
    expect(estimateGptImage2Credits(input)).toBe(0.56);
  });

  it("throws a clean error for unknown node type", () => {
    expect(() => estimateCredits("not_a_real_node", {})).toThrow(
      /Unknown node type: not_a_real_node/,
    );
  });
});
