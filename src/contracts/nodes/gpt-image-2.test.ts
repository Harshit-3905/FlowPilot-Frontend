import { describe, expect, it } from "vitest";
import {
  assertConnectorSettingParity,
} from "../connector-setting-parity";
import { estimateCredits } from "../estimate-credits";
import {
  NodeDefinitionSchema,
  getNode,
  isUiFieldVisibleForSubModel,
  listNodes,
} from "../node-definition";
import {
  GptImage2InputSchema,
  GptImage2OutputSchema,
  gptImage2Definition,
} from "./gpt-image-2";

describe("gpt_image_2 definition", () => {
  it("parses as a NodeDefinition", () => {
    const parsed = NodeDefinitionSchema.parse(gptImage2Definition);
    expect(parsed.type).toBe("gpt_image_2");
    expect(parsed.label).toBe("GPT Image 2");
    expect(parsed.ui.fields.some((f) => f.advanced === true)).toBe(true);
    expect(parsed.ui.handles.inputs.every((h) => h.id.startsWith("in:"))).toBe(
      true,
    );
    expect(parsed.ui.handles.outputs[0]?.id).toBe("out:result");
    expect(parsed.ui.handles.outputs[0]?.label).toBe("Generated Images");
  });

  it("registers via getNode / listNodes", () => {
    const node = getNode("gpt_image_2");
    expect(node).toBe(gptImage2Definition);
    expect(listNodes().map((n) => n.type)).toContain("gpt_image_2");
  });

  it("exposes Text to Image and Image to Image subModels", () => {
    expect(gptImage2Definition.subModels?.map((s) => s.id)).toEqual([
      "gpt-image-2-text",
      "gpt-image-2-edit",
    ]);
    expect(gptImage2Definition.subModels?.map((s) => s.label)).toEqual([
      "Text to Image",
      "Image to Image",
    ]);
  });

  it("orders primary fields to match T2I shots; Image is I2I-only", () => {
    const primaryKeys = gptImage2Definition.ui.fields
      .filter((f) => !f.advanced)
      .map((f) => f.key);
    expect(primaryKeys).toEqual([
      "prompt",
      "size",
      "quality",
      "n",
      "image_urls",
    ]);

    const imageField = gptImage2Definition.ui.fields.find(
      (f) => f.key === "image_urls",
    );
    expect(imageField?.subModelIds).toEqual(["gpt-image-2-edit"]);
    expect(imageField?.label).toBe("Image");
    expect(
      isUiFieldVisibleForSubModel(imageField!, "gpt-image-2-text"),
    ).toBe(false);
    expect(
      isUiFieldVisibleForSubModel(imageField!, "gpt-image-2-edit"),
    ).toBe(true);

    const advancedKeys = gptImage2Definition.ui.fields
      .filter((f) => f.advanced)
      .map((f) => f.key);
    expect(advancedKeys).toEqual([
      "background",
      "output_format",
      "output_compression",
    ]);
  });

  it("passes connector–setting parity", () => {
    assertConnectorSettingParity(gptImage2Definition);
  });

  it("applies input defaults on empty object", () => {
    expect(GptImage2InputSchema.parse({})).toEqual({
      prompt: "",
      image_urls: null,
      size: "Auto",
      quality: "High",
      n: 1,
      background: "Auto",
      output_format: "PNG",
      output_compression: 80,
    });
  });

  it("rejects invalid input", () => {
    expect(() => GptImage2InputSchema.parse({ prompt: 123 })).toThrow();
    expect(() => GptImage2InputSchema.parse({ n: "two" })).toThrow();
    expect(() => GptImage2InputSchema.parse({ n: 0 })).toThrow();
    expect(() =>
      GptImage2InputSchema.parse({ output_compression: 101 }),
    ).toThrow();
    expect(() => GptImage2InputSchema.parse({ size: "999x999" })).toThrow();
    expect(() => GptImage2InputSchema.parse({ quality: "Ultra" })).toThrow();
    expect(() =>
      GptImage2InputSchema.parse({ prompt: "x".repeat(4001) }),
    ).toThrow();
  });

  it("applies output defaults", () => {
    expect(GptImage2OutputSchema.parse({})).toEqual({ result: [] });
  });

  it("Zod round-trips input + stub-shaped output URLs", () => {
    const input = GptImage2InputSchema.parse({
      prompt: "A racing car",
      n: 2,
      quality: "High",
      output_format: "PNG",
    });
    expect(input.n).toBe(2);

    const stubOutput = {
      result: [
        "https://static.flowpilot.dev/stubs/gpt-image-2/a-racing-car-1.png",
        "https://static.flowpilot.dev/stubs/gpt-image-2/a-racing-car-2.png",
      ],
    };
    expect(GptImage2OutputSchema.parse(stubOutput)).toEqual(stubOutput);
    expect(() =>
      GptImage2OutputSchema.parse({ result: ["not-a-url"] }),
    ).toThrow();
  });

  it("credits estimate metadata matches ~0.21M × n", () => {
    expect(estimateCredits("gpt_image_2", {})).toBe(0.21);
    expect(estimateCredits("gpt_image_2", { quality: "High", n: 2 })).toBe(
      0.42,
    );
  });

  it("field keys match in:<key> handles (order-independent)", () => {
    const keys = gptImage2Definition.ui.fields.map((f) => f.key);
    const handleIds = gptImage2Definition.ui.handles.inputs.map((h) => h.id);
    for (const key of keys) {
      expect(handleIds).toContain(`in:${key}`);
    }
  });

  it("select fields have options arrays with at least one entry", () => {
    const selectFields = gptImage2Definition.ui.fields.filter(
      (f) => f.control === "select",
    );
    expect(selectFields.length).toBeGreaterThan(0);
    for (const field of selectFields) {
      expect(field.options).toBeDefined();
      expect(field.options!.length).toBeGreaterThan(0);
      expect(field.options!.every((o) => o.value && o.label)).toBe(true);
    }
  });

  it("select field options include the default value", () => {
    const sizeField = gptImage2Definition.ui.fields.find((f) => f.key === "size");
    const qualityField = gptImage2Definition.ui.fields.find(
      (f) => f.key === "quality",
    );
    expect(sizeField?.options?.map((o) => o.value)).toContain(sizeField?.default);
    expect(qualityField?.options?.map((o) => o.value)).toContain(
      qualityField?.default,
    );
  });
});
