import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  assertConnectorSettingParity,
  connectorSettingParityErrors,
} from "./connector-setting-parity";
import { listNodes, type NodeDefinition } from "./node-definition";

/** Deliberate bad definition — not registered — field without connector. */
const badParityDefinition = {
  type: "bad_parity_fixture",
  label: "Bad Parity Fixture",
  category: "utility",
  input: z.object({
    prompt: z.string(),
    orphan: z.string().optional(),
  }),
  output: z.object({ result: z.string() }),
  ui: {
    fields: [
      { key: "prompt", control: "text" as const, label: "Prompt" },
      { key: "orphan", control: "text" as const, label: "Orphan" },
    ],
    handles: {
      inputs: [{ id: "in:prompt", label: "Prompt", dataType: "string" }],
      outputs: [{ id: "out:result", label: "Result", dataType: "string" }],
    },
  },
} satisfies NodeDefinition;

describe("assertConnectorSettingParity", () => {
  it("passes for every registered node (listNodes)", () => {
    const nodes = listNodes();
    expect(nodes.length).toBeGreaterThan(0);
    for (const def of nodes) {
      expect(() => assertConnectorSettingParity(def)).not.toThrow();
      expect(connectorSettingParityErrors(def)).toEqual([]);
    }
  });

  it("gpt_image_2 passes parity", () => {
    const gpt = listNodes().find((n) => n.type === "gpt_image_2");
    expect(gpt).toBeDefined();
    assertConnectorSettingParity(gpt!);
  });

  it("fails when a ui.field has no matching in:<key> handle", () => {
    expect(connectorSettingParityErrors(badParityDefinition)).toEqual([
      "orphan",
    ]);
    expect(() => assertConnectorSettingParity(badParityDefinition)).toThrow(
      /bad_parity_fixture.*in:orphan/,
    );
  });
});
