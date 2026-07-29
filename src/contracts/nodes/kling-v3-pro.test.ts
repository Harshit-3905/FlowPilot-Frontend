import { describe, expect, it } from "vitest";
import { assertConnectorSettingParity } from "../connector-setting-parity";
import { estimateCredits } from "../estimate-credits";
import {
  NodeDefinitionSchema,
  getNode,
  isUiFieldVisibleForSubModel,
  listNodes,
} from "../node-definition";
import {
  KlingV3ProInputSchema,
  KlingV3ProOutputSchema,
  klingV3ProDefinition,
} from "./kling-v3-pro";

describe("kling_v3_pro definition", () => {
  it("parses as a NodeDefinition", () => {
    const parsed = NodeDefinitionSchema.parse(klingV3ProDefinition);
    expect(parsed.type).toBe("kling_v3_pro");
    expect(parsed.label).toBe("Kling v3 Pro");
    expect(parsed.category).toBe("video");
    expect(parsed.limits?.maxDurationSec).toBe(10);
    expect(parsed.ui.handles.inputs.every((h) => h.id.startsWith("in:"))).toBe(
      true,
    );
    expect(parsed.ui.handles.outputs[0]?.id).toBe("out:result");
    expect(parsed.ui.handles.outputs[0]?.label).toBe("Generated Video");
    expect(parsed.ui.handles.outputs[0]?.dataType).toBe("video");
  });

  it("registers via getNode / listNodes", () => {
    const node = getNode("kling_v3_pro");
    expect(node).toBe(klingV3ProDefinition);
    expect(listNodes().map((n) => n.type)).toContain("kling_v3_pro");
  });

  it("exposes Text to Video and Image to Video subModels", () => {
    expect(klingV3ProDefinition.subModels?.map((s) => s.id)).toEqual([
      "kling-v3-pro-text-to-video",
      "kling-v3-pro-image-to-video",
    ]);
    expect(klingV3ProDefinition.subModels?.map((s) => s.label)).toEqual([
      "Text to Video",
      "Image to Video",
    ]);
  });

  it("orders primary fields to match T2V shot; Image is I2V-only", () => {
    const primaryKeys = klingV3ProDefinition.ui.fields
      .filter((f) => !f.advanced)
      .map((f) => f.key);
    expect(primaryKeys).toEqual([
      "image_url",
      "prompt",
      "aspect_ratio",
      "duration",
      "negative_prompt",
      "generate_audio",
    ]);

    const imageField = klingV3ProDefinition.ui.fields.find(
      (f) => f.key === "image_url",
    );
    expect(imageField?.subModelIds).toEqual(["kling-v3-pro-image-to-video"]);
    expect(imageField?.label).toBe("Image");
    expect(
      isUiFieldVisibleForSubModel(imageField!, "kling-v3-pro-text-to-video"),
    ).toBe(false);
    expect(
      isUiFieldVisibleForSubModel(imageField!, "kling-v3-pro-image-to-video"),
    ).toBe(true);
  });

  it("passes connector–setting parity", () => {
    assertConnectorSettingParity(klingV3ProDefinition);
  });

  it("applies input defaults on empty object", () => {
    expect(KlingV3ProInputSchema.parse({})).toEqual({
      prompt: "",
      image_url: null,
      aspect_ratio: "16:9",
      duration: 5,
      negative_prompt: "",
      generate_audio: false,
    });
  });

  it("rejects invalid input with clear limit errors", () => {
    expect(() => KlingV3ProInputSchema.parse({ prompt: 123 })).toThrow();
    expect(() =>
      KlingV3ProInputSchema.parse({ aspect_ratio: "4:3" }),
    ).toThrow(/Aspect ratio must be one of/);
    expect(() => KlingV3ProInputSchema.parse({ duration: 15 })).toThrow(
      /Duration must be 5 or 10 seconds/,
    );
    expect(() => KlingV3ProInputSchema.parse({ duration: "15" })).toThrow(
      /Duration must be 5 or 10 seconds/,
    );
    expect(() =>
      KlingV3ProInputSchema.parse({ prompt: "x".repeat(2501) }),
    ).toThrow();
    expect(() =>
      KlingV3ProInputSchema.parse({ negative_prompt: "x".repeat(2501) }),
    ).toThrow();
  });

  it("coerces duration select string values", () => {
    expect(KlingV3ProInputSchema.parse({ duration: "10" }).duration).toBe(10);
    expect(KlingV3ProInputSchema.parse({ duration: "5" }).duration).toBe(5);
  });

  it("applies output defaults", () => {
    expect(KlingV3ProOutputSchema.parse({})).toEqual({ result: null });
  });

  it("Zod round-trips input + stub-shaped output URL", () => {
    const input = KlingV3ProInputSchema.parse({
      prompt: "A racing car",
      aspect_ratio: "16:9",
      duration: 5,
      generate_audio: true,
    });
    expect(input.generate_audio).toBe(true);

    const stubOutput = {
      result: "https://static.flowpilot.dev/stubs/kling-v3-pro/a-racing-car.mp4",
    };
    expect(KlingV3ProOutputSchema.parse(stubOutput)).toEqual(stubOutput);
    expect(() =>
      KlingV3ProOutputSchema.parse({ result: "not-a-url" }),
    ).toThrow();
  });

  it("credits estimate metadata matches ~0.84M", () => {
    expect(estimateCredits("kling_v3_pro", {})).toBe(0.84);
    expect(
      estimateCredits("kling_v3_pro", { duration: 10, generate_audio: true }),
    ).toBe(0.84);
  });

  it("field keys match in:<key> handles (order-independent)", () => {
    const keys = klingV3ProDefinition.ui.fields.map((f) => f.key);
    const handleIds = klingV3ProDefinition.ui.handles.inputs.map((h) => h.id);
    for (const key of keys) {
      expect(handleIds).toContain(`in:${key}`);
    }
  });

  it("select fields have options including defaults", () => {
    const aspectField = klingV3ProDefinition.ui.fields.find(
      (f) => f.key === "aspect_ratio",
    );
    const durationField = klingV3ProDefinition.ui.fields.find(
      (f) => f.key === "duration",
    );
    expect(aspectField?.options?.map((o) => o.value)).toContain(
      aspectField?.default,
    );
    expect(durationField?.options?.map((o) => o.value)).toContain(
      String(durationField?.default),
    );
  });
});
