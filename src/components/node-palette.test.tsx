import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { NodePalette } from "./node-palette";
import { useEditorStore } from "@/store/editor-store";

afterEach(() => {
  cleanup();
  useEditorStore.setState({ nodes: [], edges: [] });
});

describe("NodePalette overlay", () => {
  it("renders nothing when closed", () => {
    const { queryByTestId } = render(
      <NodePalette open={false} onClose={() => undefined} />,
    );
    expect(queryByTestId("node-palette")).not.toBeInTheDocument();
  });

  it("shows Search nodes or models and category folders", () => {
    const { getByTestId } = render(
      <NodePalette open onClose={() => undefined} />,
    );
    expect(getByTestId("palette-search")).toHaveAttribute(
      "placeholder",
      "Search nodes or models...",
    );
    expect(getByTestId("palette-cat-IMAGE")).toBeInTheDocument();
    expect(getByTestId("palette-cat-VIDEO")).toBeInTheDocument();
    expect(getByTestId("palette-cat-AUDIO")).toBeInTheDocument();
    expect(getByTestId("palette-cat-OTHERS")).toBeInTheDocument();
  });

  it("drills into Generate Image and adds gpt_image_2", () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <NodePalette open onClose={onClose} />,
    );
    fireEvent.click(getByTestId("palette-folder-IMAGE-Generate Image"));
    fireEvent.click(getByTestId("palette-item-gpt_image_2"));
    expect(useEditorStore.getState().nodes).toHaveLength(1);
    expect(useEditorStore.getState().nodes[0]?.type).toBe("gpt_image_2");
    expect(onClose).toHaveBeenCalled();
  });

  it("filters leaves via search", () => {
    const { getByTestId, queryByTestId } = render(
      <NodePalette open onClose={() => undefined} />,
    );
    fireEvent.change(getByTestId("palette-search"), {
      target: { value: "merge" },
    });
    expect(getByTestId("palette-item-merge_videos")).toBeInTheDocument();
    expect(queryByTestId("palette-item-gpt_image_2")).not.toBeInTheDocument();
  });
});
