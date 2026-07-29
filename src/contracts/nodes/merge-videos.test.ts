import { describe, expect, it } from "vitest";
import { assertConnectorSettingParity } from "../connector-setting-parity";
import { estimateCredits } from "../estimate-credits";
import {
  NodeDefinitionSchema,
  getNode,
  listNodes,
} from "../node-definition";
import {
  MERGE_VIDEOS_TRANSITIONS,
  MergeVideosInputSchema,
  MergeVideosOutputSchema,
  mergeVideosDefinition,
} from "./merge-videos";

describe("merge_videos definition", () => {
  it("parses as a NodeDefinition", () => {
    const parsed = NodeDefinitionSchema.parse(mergeVideosDefinition);
    expect(parsed.type).toBe("merge_videos");
    expect(parsed.label).toBe("Merge Videos");
    expect(parsed.category).toBe("utility");
    expect(parsed.provider?.kind).toBe("ffmpeg");
    expect(parsed.provider?.adapterId).toBe("ffmpeg.merge_videos");
    expect(parsed.credits).toEqual({ static: 0.04 });
    expect(parsed.ui.handles.inputs.every((h) => h.id.startsWith("in:"))).toBe(
      true,
    );
    expect(parsed.ui.handles.outputs[0]?.id).toBe("out:result");
    expect(parsed.ui.handles.outputs[0]?.label).toBe("Merged Video");
    expect(parsed.ui.handles.outputs[0]?.dataType).toBe("video");
  });

  it("registers via getNode / listNodes", () => {
    const node = getNode("merge_videos");
    expect(node).toBe(mergeVideosDefinition);
    expect(listNodes().map((n) => n.type)).toContain("merge_videos");
  });

  it("orders primary fields to match Merge Videos shot", () => {
    expect(mergeVideosDefinition.ui.fields.map((f) => f.key)).toEqual([
      "videos",
      "transition",
    ]);
    expect(mergeVideosDefinition.ui.fields[0]?.label).toBe("Videos");
    expect(mergeVideosDefinition.ui.fields[0]?.control).toBe("file");
    expect(mergeVideosDefinition.ui.fields[1]?.control).toBe("select");
    expect(mergeVideosDefinition.ui.fields[1]?.options?.map((o) => o.value)).toEqual(
      [...MERGE_VIDEOS_TRANSITIONS],
    );
  });

  it("passes connector–setting parity", () => {
    assertConnectorSettingParity(mergeVideosDefinition);
  });

  it("applies transition default; requires ≥2 videos", () => {
    expect(
      MergeVideosInputSchema.parse({
        videos: ["https://a.example/v1.mp4", "https://a.example/v2.mp4"],
      }),
    ).toEqual({
      videos: ["https://a.example/v1.mp4", "https://a.example/v2.mp4"],
      transition: "none",
    });
  });

  it("rejects fewer than 2 videos with a clear message", () => {
    expect(() => MergeVideosInputSchema.parse({ videos: [] })).toThrow(
      /at least 2 videos/i,
    );
    expect(() =>
      MergeVideosInputSchema.parse({ videos: ["https://a.example/v1.mp4"] }),
    ).toThrow(/at least 2 videos/i);
    expect(() => MergeVideosInputSchema.parse({})).toThrow();
  });

  it("rejects unknown transition", () => {
    expect(() =>
      MergeVideosInputSchema.parse({
        videos: ["https://a.example/v1.mp4", "https://a.example/v2.mp4"],
        transition: "wipe",
      }),
    ).toThrow(/Transition must be one of: none/);
  });

  it("accepts nullable merged video URL output", () => {
    expect(MergeVideosOutputSchema.parse({})).toEqual({ result: null });
    expect(
      MergeVideosOutputSchema.parse({
        result: "https://static.flowpilot.dev/merged/out.mp4",
      }),
    ).toEqual({ result: "https://static.flowpilot.dev/merged/out.mp4" });
    expect(
      MergeVideosOutputSchema.parse({ result: "file:///tmp/merged.mp4" }),
    ).toEqual({ result: "file:///tmp/merged.mp4" });
  });

  it("rejects non-URL output", () => {
    expect(() =>
      MergeVideosOutputSchema.parse({ result: "not-a-url" }),
    ).toThrow();
  });

  it("estimates static credits (~0.04M)", () => {
    expect(estimateCredits("merge_videos", {})).toBe(0.04);
    expect(
      estimateCredits("merge_videos", {
        videos: ["https://a.example/v1.mp4", "https://a.example/v2.mp4"],
      }),
    ).toBe(0.04);
  });
});
