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
  Seedance20InputSchema,
  Seedance20OutputSchema,
  seedance20Definition,
} from "./seedance-2-0";

describe("seedance_2_0 definition", () => {
  it("parses as a NodeDefinition", () => {
    const parsed = NodeDefinitionSchema.parse(seedance20Definition);
    expect(parsed.type).toBe("seedance_2_0");
    expect(parsed.label).toBe("Seedance 2.0");
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
    const node = getNode("seedance_2_0");
    expect(node).toBe(seedance20Definition);
    expect(listNodes().map((n) => n.type)).toContain("seedance_2_0");
  });

  it("exposes Text to Video and Image to Video subModels", () => {
    expect(seedance20Definition.subModels?.map((s) => s.id)).toEqual([
      "seedance-2.0-text-to-video",
      "seedance-2.0-image-to-video",
    ]);
    expect(seedance20Definition.subModels?.map((s) => s.label)).toEqual([
      "Text to Video",
      "Image to Video",
    ]);
  });

  it("orders primary fields to match I2V shot; Image/End Frame are I2V-only", () => {
    const primaryKeys = seedance20Definition.ui.fields
      .filter((f) => !f.advanced)
      .map((f) => f.key);
    expect(primaryKeys).toEqual([
      "image_url",
      "prompt",
      "end_image_url",
      "duration",
      "aspect_ratio",
      "resolution",
      "generate_audio",
    ]);

    const imageField = seedance20Definition.ui.fields.find(
      (f) => f.key === "image_url",
    );
    const endFrameField = seedance20Definition.ui.fields.find(
      (f) => f.key === "end_image_url",
    );
    expect(imageField?.subModelIds).toEqual(["seedance-2.0-image-to-video"]);
    expect(endFrameField?.subModelIds).toEqual([
      "seedance-2.0-image-to-video",
    ]);
    expect(
      isUiFieldVisibleForSubModel(imageField!, "seedance-2.0-text-to-video"),
    ).toBe(false);
    expect(
      isUiFieldVisibleForSubModel(imageField!, "seedance-2.0-image-to-video"),
    ).toBe(true);
  });

  it("passes connector–setting parity", () => {
    assertConnectorSettingParity(seedance20Definition);
  });

  it("applies input defaults on empty object", () => {
    expect(Seedance20InputSchema.parse({})).toEqual({
      prompt: "",
      image_url: null,
      end_image_url: null,
      aspect_ratio: "16:9",
      duration: 5,
      resolution: "720p",
      generate_audio: true,
    });
  });

  it("rejects invalid input with clear limit errors", () => {
    expect(() => Seedance20InputSchema.parse({ prompt: 123 })).toThrow();
    expect(() =>
      Seedance20InputSchema.parse({ aspect_ratio: "4:3" }),
    ).toThrow(/Aspect ratio must be one of/);
    expect(() => Seedance20InputSchema.parse({ duration: 15 })).toThrow(
      /Duration must be 5 or 10 seconds/,
    );
    expect(() =>
      Seedance20InputSchema.parse({ resolution: "4k" }),
    ).toThrow(/Resolution must be one of/);
    expect(() =>
      Seedance20InputSchema.parse({ prompt: "x".repeat(2501) }),
    ).toThrow();
  });

  it("coerces duration select string values", () => {
    expect(Seedance20InputSchema.parse({ duration: "10" }).duration).toBe(10);
    expect(Seedance20InputSchema.parse({ duration: "5" }).duration).toBe(5);
  });

  it("applies output defaults", () => {
    expect(Seedance20OutputSchema.parse({})).toEqual({ result: null });
  });

  it("Zod round-trips input + stub-shaped output URL", () => {
    const input = Seedance20InputSchema.parse({
      prompt: "A racing car",
      aspect_ratio: "16:9",
      duration: 5,
      resolution: "720p",
      generate_audio: true,
    });
    expect(input.generate_audio).toBe(true);

    const stubOutput = {
      result:
        "https://static.flowpilot.dev/stubs/seedance-2-0/a-racing-car.mp4",
    };
    expect(Seedance20OutputSchema.parse(stubOutput)).toEqual(stubOutput);
    expect(() =>
      Seedance20OutputSchema.parse({ result: "not-a-url" }),
    ).toThrow();
  });

  it("credits estimate metadata matches ~1.51M", () => {
    expect(estimateCredits("seedance_2_0", {})).toBe(1.51);
  });

  it("field keys match in:<key> handles (order-independent)", () => {
    const keys = seedance20Definition.ui.fields.map((f) => f.key);
    const handleIds = seedance20Definition.ui.handles.inputs.map((h) => h.id);
    for (const key of keys) {
      expect(handleIds).toContain(`in:${key}`);
    }
  });
});
