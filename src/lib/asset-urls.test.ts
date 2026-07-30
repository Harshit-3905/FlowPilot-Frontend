import { describe, expect, it } from "vitest";
import { extractAssetUrls, isLikelyImageUrl } from "./asset-urls";

describe("extractAssetUrls", () => {
  it("returns empty for nullish / non-url values", () => {
    expect(extractAssetUrls(null)).toEqual([]);
    expect(extractAssetUrls({ text: "hello" })).toEqual([]);
    expect(extractAssetUrls("not-a-url")).toEqual([]);
  });

  it("extracts a bare URL string", () => {
    expect(extractAssetUrls("https://cdn.example/a.png")).toEqual([
      "https://cdn.example/a.png",
    ]);
  });

  it("extracts URL arrays (stub gpt_image_2 shape)", () => {
    expect(
      extractAssetUrls({
        result: [
          "https://static.flowpilot.dev/stubs/a-1.png",
          "https://static.flowpilot.dev/stubs/a-2.png",
        ],
      }),
    ).toEqual([
      "https://static.flowpilot.dev/stubs/a-1.png",
      "https://static.flowpilot.dev/stubs/a-2.png",
    ]);
  });

  it("extracts a single result URL (kling shape)", () => {
    expect(
      extractAssetUrls({
        result: "https://static.flowpilot.dev/stubs/out.mp4",
      }),
    ).toEqual(["https://static.flowpilot.dev/stubs/out.mp4"]);
  });

  it("dedupes repeated URLs", () => {
    expect(
      extractAssetUrls({
        url: "https://cdn.example/x.png",
        mirror: "https://cdn.example/x.png",
      }),
    ).toEqual(["https://cdn.example/x.png"]);
  });
});

describe("isLikelyImageUrl", () => {
  it("detects common image extensions", () => {
    expect(isLikelyImageUrl("https://cdn.example/a.PNG")).toBe(true);
    expect(isLikelyImageUrl("https://cdn.example/a.mp4")).toBe(false);
  });
});
