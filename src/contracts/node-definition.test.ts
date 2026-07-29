import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  NodeDefinitionSchema,
  getNode,
  listNodes,
  nodeRegistry,
  type NodeDefinition,
} from "./node-definition";

/** Minimal fixture matching product handle conventions (`in:` / `out:`). */
const fixtureDefinition = {
  type: "passthrough_fixture",
  label: "Passthrough Fixture",
  category: "utility",
  input: z.object({ prompt: z.string() }),
  output: z.object({ result: z.string() }),
  ui: {
    fields: [
      {
        key: "prompt",
        control: "text" as const,
        label: "Prompt",
        default: "",
      },
    ],
    handles: {
      inputs: [
        { id: "in:prompt", label: "Prompt", dataType: "string" },
      ],
      outputs: [
        { id: "out:result", label: "Result", dataType: "string" },
      ],
    },
  },
  credits: { static: 0 },
  limits: { maxFileSize: 1024 },
  provider: { kind: "stub" as const, adapterId: "stub.passthrough" },
} satisfies NodeDefinition;

describe("NodeDefinitionSchema", () => {
  it("parses a minimal fixture definition", () => {
    const parsed = NodeDefinitionSchema.parse(fixtureDefinition);
    expect(parsed.type).toBe("passthrough_fixture");
    expect(parsed.label).toBe("Passthrough Fixture");
    expect(parsed.category).toBe("utility");
    expect(parsed.ui.fields[0]?.key).toBe("prompt");
    expect(parsed.ui.handles.inputs[0]?.id).toBe("in:prompt");
    expect(parsed.ui.handles.outputs[0]?.id).toBe("out:result");
    expect(parsed.input.parse({ prompt: "hi" })).toEqual({ prompt: "hi" });
    expect(parsed.output.parse({ result: "ok" })).toEqual({ result: "ok" });
  });

  it("rejects missing type", () => {
    const rest = {
      label: fixtureDefinition.label,
      category: fixtureDefinition.category,
      input: fixtureDefinition.input,
      output: fixtureDefinition.output,
      ui: fixtureDefinition.ui,
    };
    expect(() => NodeDefinitionSchema.parse(rest)).toThrow();
  });

  it("rejects non-schema input", () => {
    expect(() =>
      NodeDefinitionSchema.parse({
        ...fixtureDefinition,
        input: { prompt: "not-a-zod-schema" },
      }),
    ).toThrow();
  });
});

describe("nodeRegistry", () => {
  it("includes gpt_image_2", () => {
    expect(nodeRegistry.gpt_image_2?.type).toBe("gpt_image_2");
    expect(getNode("gpt_image_2")?.label).toBe("GPT Image 2");
    expect(listNodes().some((n) => n.type === "gpt_image_2")).toBe(true);
  });

  it("getNode unknown type returns undefined", () => {
    expect(getNode("missing")).toBeUndefined();
  });

  it("type-level: getNode returns NodeDefinition | undefined", () => {
    expectTypeOf(getNode("x")).toEqualTypeOf<NodeDefinition | undefined>();
    expectTypeOf(listNodes()).toEqualTypeOf<NodeDefinition[]>();
    expectTypeOf(fixtureDefinition).toMatchTypeOf<NodeDefinition>();
  });
});
