import { describe, expect, it } from "vitest";
import { assertConnectorSettingParity } from "../connector-setting-parity";
import { estimateCredits } from "../estimate-credits";
import {
  NodeDefinitionSchema,
  getNode,
  listNodes,
} from "../node-definition";
import {
  RequestInputSchema,
  RequestOutputSchema,
  requestDefinition,
} from "./request";

describe("request definition", () => {
  it("parses as a NodeDefinition", () => {
    const parsed = NodeDefinitionSchema.parse(requestDefinition);
    expect(parsed.type).toBe("request");
    expect(parsed.label).toBe("Request Inputs");
    expect(parsed.category).toBe("io");
    expect(parsed.ui.fields).toEqual([]);
    expect(parsed.ui.handles.inputs).toEqual([]);
    expect(parsed.ui.handles.outputs).toEqual([]);
  });

  it("registers via getNode / listNodes", () => {
    const node = getNode("request");
    expect(node).toBe(requestDefinition);
    expect(listNodes().map((n) => n.type)).toContain("request");
  });

  it("passes connector–setting parity (no static fields)", () => {
    assertConnectorSettingParity(requestDefinition);
  });

  it("applies input defaults on empty object", () => {
    expect(RequestInputSchema.parse({})).toEqual({ dynamicFields: [] });
  });

  it("parses fixture-shaped dynamicFields", () => {
    const parsed = RequestInputSchema.parse({
      dynamicFields: [
        {
          id: "field_1772800834393_nijovpcrb",
          name: "Car prompt",
          type: "text",
          value: "",
        },
      ],
    });
    expect(parsed.dynamicFields).toHaveLength(1);
    expect(parsed.dynamicFields[0]?.id).toBe("field_1772800834393_nijovpcrb");
  });

  it("rejects dynamicFields missing id/name", () => {
    expect(() =>
      RequestInputSchema.parse({
        dynamicFields: [{ name: "x", type: "text", value: "" }],
      }),
    ).toThrow();
  });

  it("applies output defaults", () => {
    expect(RequestOutputSchema.parse({})).toEqual({ fields: {} });
  });

  it("Zod round-trips stub-shaped output", () => {
    const stub = {
      fields: { field_1772800834393_nijovpcrb: "red sports car" },
    };
    expect(RequestOutputSchema.parse(stub)).toEqual(stub);
  });

  it("credits are zero", () => {
    expect(estimateCredits("request", {})).toBe(0);
  });
});
