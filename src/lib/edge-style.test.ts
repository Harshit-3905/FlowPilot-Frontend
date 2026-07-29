import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  coloredEdgeFromConnection,
  colorizeEdge,
  edgeStyleForDataType,
  sourceHandleDataType,
} from "./edge-style";

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
    position: { x: 100, y: 0 },
    data: {},
  },
];

describe("edge-style", () => {
  it("edgeStyleForDataType uses port hex colors", () => {
    expect(edgeStyleForDataType("image[]")).toEqual({
      stroke: "#3b82f6",
      strokeWidth: 2,
    });
    expect(edgeStyleForDataType("string")).toEqual({
      stroke: "#f97316",
      strokeWidth: 2,
    });
  });

  it("sourceHandleDataType reads out:result as image[]", () => {
    expect(sourceHandleDataType(nodes, "a", "out:result")).toBe("image[]");
  });

  it("coloredEdgeFromConnection sets blue stroke for image output", () => {
    const edge = coloredEdgeFromConnection(
      {
        source: "a",
        target: "b",
        sourceHandle: "out:result",
        targetHandle: "in:image_urls",
      },
      nodes,
      "e1",
    );
    expect(edge.style?.stroke).toBe("#3b82f6");
    expect(edge.type).toBe("default");
  });

  it("colorizeEdge fills missing stroke from source handle", () => {
    const bare: Edge = {
      id: "e2",
      source: "a",
      target: "b",
      sourceHandle: "out:result",
      targetHandle: "in:image_urls",
    };
    expect(colorizeEdge(bare, nodes).style?.stroke).toBe("#3b82f6");
  });
});
