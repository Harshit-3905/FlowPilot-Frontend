import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listNodes } from "./node-definition";

/**
 * Machine inventory SSOT lives under docs/ (not duplicated in contracts).
 * Relative path is identical from frontend/src/contracts and backend/src/contracts.
 */
const inventoryPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../docs/reference/node-inventory.json",
);

const MANDATORY_TYPES = [
  "request",
  "response",
  "gpt_5_5_pro",
  "gpt_image_2",
  "seedance_2_0",
  "kling_v3_pro",
  "merge_videos",
] as const;

type InventoryFile = {
  schemaVersion: number;
  nodes: Array<{ type: string }>;
};

function loadInventoryTypes(): Set<string> {
  const raw = JSON.parse(readFileSync(inventoryPath, "utf8")) as InventoryFile;
  expect(raw.schemaVersion).toBe(1);
  expect(Array.isArray(raw.nodes)).toBe(true);
  return new Set(raw.nodes.map((n) => n.type));
}

describe("inventory ↔ registry (06 Slice 7 equality)", () => {
  it("every listNodes() type is listed in node-inventory.json", () => {
    const inventory = loadInventoryTypes();
    const registered = listNodes().map((n) => n.type);
    expect(registered.length).toBeGreaterThan(0);
    for (const type of registered) {
      expect(
        inventory.has(type),
        `registered type "${type}" missing from docs/reference/node-inventory.json`,
      ).toBe(true);
    }
  });

  it("inventory includes mandatory confirmed slugs", () => {
    const inventory = loadInventoryTypes();
    for (const type of MANDATORY_TYPES) {
      expect(
        inventory.has(type),
        `mandatory slug "${type}" missing from inventory`,
      ).toBe(true);
    }
  });

  it("every inventory type is registered (inventory ⊆ registry / equality)", () => {
    const inventory = loadInventoryTypes();
    const registered = new Set(listNodes().map((n) => n.type));

    for (const type of inventory) {
      expect(
        registered.has(type),
        `inventory type "${type}" missing from listNodes()`,
      ).toBe(true);
    }

    expect([...registered].sort()).toEqual([...inventory].sort());
  });
});
