import { describe, it, expect } from "vitest";
import { wouldCreateCycle } from "./cycle-detection";

describe("wouldCreateCycle", () => {
  it("allows A→B→C chain", () => {
    const edges = [{ source: "A", target: "B" }];
    expect(wouldCreateCycle(edges, "B", "C")).toBe(false);
  });

  it("rejects A→B + B→A (direct back-edge)", () => {
    const edges = [{ source: "A", target: "B" }];
    expect(wouldCreateCycle(edges, "B", "A")).toBe(true);
  });

  it("allows diamond: A→B, A→C, B→D, C→D", () => {
    const edges = [
      { source: "A", target: "B" },
      { source: "A", target: "C" },
      { source: "B", target: "D" },
      { source: "C", target: "D" },
    ];
    expect(wouldCreateCycle(edges, "C", "D")).toBe(false);
  });

  it("rejects back-edge D→A in diamond", () => {
    const edges = [
      { source: "A", target: "B" },
      { source: "A", target: "C" },
      { source: "B", target: "D" },
      { source: "C", target: "D" },
    ];
    expect(wouldCreateCycle(edges, "D", "A")).toBe(true);
  });

  it("rejects self-loop", () => {
    expect(wouldCreateCycle([], "A", "A")).toBe(true);
  });

  it("allows edge with no existing edges", () => {
    expect(wouldCreateCycle([], "A", "B")).toBe(false);
  });

  it("rejects indirect cycle A→B→C + C→A", () => {
    const edges = [
      { source: "A", target: "B" },
      { source: "B", target: "C" },
    ];
    expect(wouldCreateCycle(edges, "C", "A")).toBe(true);
  });
});
