import { describe, expect, it } from "vitest";
import { assertConnectorSettingParity } from "../connector-setting-parity";
import { estimateCredits } from "../estimate-credits";
import {
  NodeDefinitionSchema,
  getNode,
  listNodes,
} from "../node-definition";
import {
  ResponseInputSchema,
  ResponseOutputSchema,
  responseDefinition,
} from "./response";

describe("response definition", () => {
  it("parses as a NodeDefinition", () => {
    const parsed = NodeDefinitionSchema.parse(responseDefinition);
    expect(parsed.type).toBe("response");
    expect(parsed.label).toBe("Response");
    expect(parsed.category).toBe("io");
    expect(parsed.ui.fields).toEqual([]);
    expect(parsed.ui.handles.inputs).toEqual([
      { id: "result", label: "result", dataType: "any" },
    ]);
    expect(parsed.ui.handles.outputs).toEqual([]);
  });

  it("registers via getNode / listNodes", () => {
    const node = getNode("response");
    expect(node).toBe(responseDefinition);
    expect(listNodes().map((n) => n.type)).toContain("response");
  });

  it("passes connector–setting parity (no static fields)", () => {
    assertConnectorSettingParity(responseDefinition);
  });

  it("uses bare result target handle (no in: prefix)", () => {
    expect(responseDefinition.ui.handles.inputs[0]?.id).toBe("result");
    expect(
      responseDefinition.ui.handles.inputs[0]?.id.startsWith("in:"),
    ).toBe(false);
  });

  it("applies input/output defaults", () => {
    expect(ResponseInputSchema.parse({})).toEqual({ result: null });
    expect(ResponseOutputSchema.parse({})).toEqual({ result: null });
  });

  it("accepts any result payload (passthrough sink)", () => {
    expect(
      ResponseInputSchema.parse({
        result: ["https://example.com/a.png"],
      }).result,
    ).toEqual(["https://example.com/a.png"]);
    expect(
      ResponseOutputSchema.parse({
        result: "https://example.com/v.mp4",
      }).result,
    ).toBe("https://example.com/v.mp4");
  });

  it("credits are zero", () => {
    expect(estimateCredits("response", {})).toBe(0);
  });
});
