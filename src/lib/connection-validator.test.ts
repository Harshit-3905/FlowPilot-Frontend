import { describe, it, expect } from "vitest";
import { typesCompatible, makeIsValidConnection } from "./connection-validator";
import type { Node } from "@xyflow/react";

describe("typesCompatible", () => {
  it("string→string OK", () => {
    expect(typesCompatible("string", "string")).toBe(true);
  });

  it("image→image OK", () => {
    expect(typesCompatible("image", "image")).toBe(true);
  });

  it("string→image REJECTED", () => {
    expect(typesCompatible("string", "image")).toBe(false);
  });

  it("any→string OK", () => {
    expect(typesCompatible("any", "string")).toBe(true);
  });

  it("string→any OK", () => {
    expect(typesCompatible("string", "any")).toBe(true);
  });

  it("any→any OK", () => {
    expect(typesCompatible("any", "any")).toBe(true);
  });

  it("image→video REJECTED", () => {
    expect(typesCompatible("image", "video")).toBe(false);
  });
});

// Integration test using real node registry (gpt_image_2)
describe("makeIsValidConnection (registry)", () => {
  const nodes: Node[] = [
    {
      id: "a",
      type: "gpt_image_2",
      position: { x: 0, y: 0 },
      data: {},
    },
    {
      id: "b",
      type: "gpt_image_2",
      position: { x: 200, y: 0 },
      data: {},
    },
  ];

  const validator = makeIsValidConnection(nodes);

  it("image[]→image[] OK (out:result → in:image_urls)", () => {
    expect(
      validator({
        source: "a",
        sourceHandle: "out:result",
        target: "b",
        targetHandle: "in:image_urls",
      }),
    ).toBe(true);
  });

  it("image[]→string REJECTED (out:result → in:prompt)", () => {
    expect(
      validator({
        source: "a",
        sourceHandle: "out:result",
        target: "b",
        targetHandle: "in:prompt",
      }),
    ).toBe(false);
  });

  it("returns false for unknown node id", () => {
    expect(
      validator({
        source: "unknown",
        sourceHandle: "out:result",
        target: "b",
        targetHandle: "in:prompt",
      }),
    ).toBe(false);
  });

  it("returns false for missing handle id", () => {
    expect(
      validator({
        source: "a",
        sourceHandle: "out:nonexistent",
        target: "b",
        targetHandle: "in:prompt",
      }),
    ).toBe(false);
  });
});
