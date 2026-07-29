import { describe, expect, it } from "vitest";
import { assertConnectorSettingParity } from "../connector-setting-parity";
import { estimateCredits } from "../estimate-credits";
import {
  NodeDefinitionSchema,
  getNode,
  listNodes,
} from "../node-definition";
import {
  Gpt55ProInputSchema,
  Gpt55ProOutputSchema,
  gpt55ProDefinition,
} from "./gpt-5-5-pro";

describe("gpt_5_5_pro definition", () => {
  it("parses as a NodeDefinition", () => {
    const parsed = NodeDefinitionSchema.parse(gpt55ProDefinition);
    expect(parsed.type).toBe("gpt_5_5_pro");
    expect(parsed.label).toBe("GPT 5.5 Pro");
    expect(parsed.category).toBe("text");
    expect(parsed.provider?.kind).toBe("openrouter");
    expect(parsed.ui.handles.inputs.every((h) => h.id.startsWith("in:"))).toBe(
      true,
    );
    expect(parsed.ui.handles.outputs[0]?.id).toBe("out:output");
    expect(parsed.ui.handles.outputs[0]?.label).toBe("Response");
    expect(parsed.ui.handles.outputs[0]?.dataType).toBe("string");
  });

  it("registers via getNode / listNodes", () => {
    const node = getNode("gpt_5_5_pro");
    expect(node).toBe(gpt55ProDefinition);
    expect(listNodes().map((n) => n.type)).toContain("gpt_5_5_pro");
  });

  it("orders primary fields to match shot; Settings fields are advanced", () => {
    const primaryKeys = gpt55ProDefinition.ui.fields
      .filter((f) => !f.advanced)
      .map((f) => f.key);
    expect(primaryKeys).toEqual(["prompt", "system_prompt", "image_urls"]);

    const advancedKeys = gpt55ProDefinition.ui.fields
      .filter((f) => f.advanced)
      .map((f) => f.key);
    expect(advancedKeys).toEqual([
      "temperature",
      "max_tokens",
      "top_p",
      "top_k",
      "min_p",
      "top_a",
      "presence_penalty",
      "frequency_penalty",
      "repetition_penalty",
      "stop",
      "seed",
      "reasoning",
      "response_format",
    ]);

    const vision = gpt55ProDefinition.ui.fields.find(
      (f) => f.key === "image_urls",
    );
    expect(vision?.label).toBe("Image (Vision)");
  });

  it("passes connector–setting parity", () => {
    assertConnectorSettingParity(gpt55ProDefinition);
  });

  it("applies input defaults on empty object", () => {
    expect(Gpt55ProInputSchema.parse({})).toEqual({
      prompt: "",
      system_prompt: "",
      image_urls: [],
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      top_k: 0,
      min_p: 0,
      top_a: 0,
      presence_penalty: 0,
      frequency_penalty: 0,
      repetition_penalty: 1,
      stop: "",
      seed: null,
      reasoning: false,
      response_format: false,
    });
  });

  it("rejects invalid input (failure path)", () => {
    expect(() => Gpt55ProInputSchema.parse({ prompt: 123 })).toThrow();
    expect(() => Gpt55ProInputSchema.parse({ temperature: 3 })).toThrow();
    expect(() => Gpt55ProInputSchema.parse({ max_tokens: 0 })).toThrow();
    expect(() => Gpt55ProInputSchema.parse({ top_p: 1.5 })).toThrow();
    expect(() => Gpt55ProInputSchema.parse({ image_urls: "not-array" })).toThrow();
    expect(() => Gpt55ProInputSchema.parse({ reasoning: "yes" })).toThrow();
  });

  it("applies output defaults", () => {
    expect(Gpt55ProOutputSchema.parse({})).toEqual({ output: "" });
  });

  it("Zod round-trips input + stub-shaped output text", () => {
    const input = Gpt55ProInputSchema.parse({
      prompt: "A racing car",
      system_prompt: "You are a helpful assistant",
      temperature: 0.5,
    });
    expect(input.prompt).toBe("A racing car");

    const stubOutput = {
      output: '[stub gpt_5_5_pro] A racing car',
    };
    expect(Gpt55ProOutputSchema.parse(stubOutput)).toEqual(stubOutput);
    expect(() => Gpt55ProOutputSchema.parse({ output: 42 })).toThrow();
  });

  it("credits estimate metadata matches ~0.0001M", () => {
    expect(estimateCredits("gpt_5_5_pro", {})).toBe(0.0001);
    expect(
      estimateCredits("gpt_5_5_pro", { prompt: "hi", max_tokens: 2048 }),
    ).toBe(0.0001);
  });

  it("field keys match in:<key> handles (order-independent)", () => {
    const keys = gpt55ProDefinition.ui.fields.map((f) => f.key);
    const handleIds = gpt55ProDefinition.ui.handles.inputs.map((h) => h.id);
    for (const key of keys) {
      expect(handleIds).toContain(`in:${key}`);
    }
  });
});
