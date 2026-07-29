import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NodeConfigForm } from "./node-config-form";
import { gptImage2Definition } from "@/contracts/nodes/gpt-image-2";

describe("NodeConfigForm — select options", () => {
  it("renders all size options in the Size select", () => {
    render(<NodeConfigForm nodeType="gpt_image_2" showHandles />);
    const sizeSelect = screen.getByLabelText("Size") as HTMLSelectElement;
    expect(sizeSelect).toBeInTheDocument();
    const options = Array.from(sizeSelect.querySelectorAll("option")).map(
      (o) => o.value,
    );
    expect(options).toContain("Auto");
    expect(options).toContain("1024x1024");
    expect(options.length).toBeGreaterThan(1);
  });

  it("renders all quality options in the Quality select", () => {
    render(<NodeConfigForm nodeType="gpt_image_2" />);
    const qualitySelect = screen.getByLabelText("Quality") as HTMLSelectElement;
    const options = Array.from(qualitySelect.querySelectorAll("option")).map(
      (o) => o.value,
    );
    expect(options).toEqual(["Auto", "High", "Medium", "Low"]);
  });

  it("select default value matches field default", () => {
    render(<NodeConfigForm nodeType="gpt_image_2" />);
    const qualitySelect = screen.getByLabelText("Quality") as HTMLSelectElement;
    expect(qualitySelect.value).toBe("High");
  });
});

describe("NodeConfigForm — debug handle labels", () => {
  it("renders handle ids without duplicate prefix", () => {
    render(<NodeConfigForm nodeDefinition={gptImage2Definition} showHandles />);
    expect(screen.getAllByText("in:prompt").length).toBeGreaterThan(0);
    expect(screen.getAllByText("out:result").length).toBeGreaterThan(0);
    expect(screen.queryByText("in: in:prompt")).not.toBeInTheDocument();
    expect(screen.queryByText("out: out:result")).not.toBeInTheDocument();
  });

  it("renders all input and output handle ids exactly once", () => {
    render(<NodeConfigForm nodeDefinition={gptImage2Definition} showHandles />);
    for (const handle of gptImage2Definition.ui.handles.inputs) {
      expect(screen.getAllByText(handle.id).length).toBeGreaterThan(0);
    }
    for (const handle of gptImage2Definition.ui.handles.outputs) {
      expect(screen.getAllByText(handle.id).length).toBeGreaterThan(0);
    }
  });
});
