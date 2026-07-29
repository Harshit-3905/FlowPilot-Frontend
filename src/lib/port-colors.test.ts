import { describe, expect, it } from "vitest";
import {
  portColorForDataType,
  portCssVarForDataType,
  portTokenForDataType,
} from "./port-colors";

describe("portTokenForDataType", () => {
  it("maps text-like types to text", () => {
    expect(portTokenForDataType("string")).toBe("text");
    expect(portTokenForDataType("text")).toBe("text");
  });

  it("maps image / image[] to image", () => {
    expect(portTokenForDataType("image")).toBe("image");
    expect(portTokenForDataType("image[]")).toBe("image");
  });

  it("maps video types to video", () => {
    expect(portTokenForDataType("video")).toBe("video");
    expect(portTokenForDataType("video[]")).toBe("video");
  });

  it("maps number / boolean to number", () => {
    expect(portTokenForDataType("number")).toBe("number");
    expect(portTokenForDataType("boolean")).toBe("number");
  });

  it("maps audio and any", () => {
    expect(portTokenForDataType("audio")).toBe("audio");
    expect(portTokenForDataType("any")).toBe("any");
    expect(portTokenForDataType("unknown_xyz")).toBe("any");
  });
});

describe("portColorForDataType", () => {
  it("returns Magica hex colors by dataType", () => {
    expect(portColorForDataType("string")).toBe("#f97316");
    expect(portColorForDataType("image[]")).toBe("#3b82f6");
    expect(portColorForDataType("video")).toBe("#22c55e");
    expect(portColorForDataType("number")).toBe("#ec4899");
    expect(portColorForDataType("audio")).toBe("#8b5cf6");
    expect(portColorForDataType("any")).toBe("#8e8e93");
  });
});

describe("portCssVarForDataType", () => {
  it("returns CSS vars for handles", () => {
    expect(portCssVarForDataType("string")).toBe("var(--port-text)");
    expect(portCssVarForDataType("image[]")).toBe("var(--port-image)");
    expect(portCssVarForDataType("video")).toBe("var(--port-video)");
  });
});
