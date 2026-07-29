import { describe, expect, it } from "vitest";
import { NodeDefinitionSchema, getNode, listNodes } from "../node-definition";
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
  });

  it("registers via getNode / listNodes", () => {
    const node = getNode("gpt_image_2");
    expect(node).toBe(gptImage2Definition);
    expect(listNodes().map((n) => n.type)).toContain("gpt_image_2");
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
  });

  it("applies output defaults", () => {
    expect(GptImage2OutputSchema.parse({})).toEqual({ result: [] });
  });

  it("field keys match in:<key> handles", () => {
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
    const qualityField = gptImage2Definition.ui.fields.find((f) => f.key === "quality");
    expect(sizeField?.options?.map((o) => o.value)).toContain(sizeField?.default);
    expect(qualityField?.options?.map((o) => o.value)).toContain(qualityField?.default);
  });
});
