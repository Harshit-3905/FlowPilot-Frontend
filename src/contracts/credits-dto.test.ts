import { describe, expect, it } from "vitest";
import {
  CreditsBalanceResponseSchema,
  CreditLedgerEntrySchema,
  CreditLedgerListResponseSchema,
  CreditLedgerQuerySchema,
  CreditsEstimateRequestSchema,
  CreditsEstimateResponseSchema,
} from "./credits-dto";

describe("CreditsBalanceResponseSchema", () => {
  it("accepts microcredit balance with optional displayM", () => {
    expect(
      CreditsBalanceResponseSchema.parse({ balance: 10_000_000 }),
    ).toEqual({ balance: 10_000_000 });
    expect(
      CreditsBalanceResponseSchema.parse({
        balance: 10_000_000,
        displayM: 10,
      }),
    ).toEqual({ balance: 10_000_000, displayM: 10 });
  });

  it("rejects non-integer balance", () => {
    expect(() =>
      CreditsBalanceResponseSchema.parse({ balance: 10.5 }),
    ).toThrow();
  });
});

describe("CreditLedgerListResponseSchema", () => {
  const entry = {
    id: "led_1",
    amount: 10_000_000,
    balanceAfter: 10_000_000,
    reason: "starting_grant",
    runId: null,
    runNodeId: null,
    createdAt: "2026-07-30T12:00:00.000Z",
    displayM: 10,
  };

  it("accepts entries + nextCursor", () => {
    expect(
      CreditLedgerListResponseSchema.parse({
        entries: [entry],
        nextCursor: null,
      }),
    ).toEqual({ entries: [entry], nextCursor: null });
  });

  it("accepts empty ledger page", () => {
    expect(
      CreditLedgerListResponseSchema.parse({
        entries: [],
        nextCursor: null,
      }),
    ).toEqual({ entries: [], nextCursor: null });
  });

  it("parses a single entry", () => {
    expect(CreditLedgerEntrySchema.parse(entry)).toEqual(entry);
  });
});

describe("CreditLedgerQuerySchema", () => {
  it("defaults limit to 20", () => {
    expect(CreditLedgerQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it("coerces limit and accepts cursor", () => {
    expect(
      CreditLedgerQuerySchema.parse({ limit: "5", cursor: "led_1" }),
    ).toEqual({ limit: 5, cursor: "led_1" });
  });

  it("rejects limit out of range", () => {
    expect(() => CreditLedgerQuerySchema.parse({ limit: 0 })).toThrow();
    expect(() => CreditLedgerQuerySchema.parse({ limit: 101 })).toThrow();
  });
});

describe("CreditsEstimateRequestSchema", () => {
  it("accepts workflowId alone", () => {
    expect(CreditsEstimateRequestSchema.parse({ workflowId: "wf_1" })).toEqual({
      workflowId: "wf_1",
    });
  });

  it("accepts graph snapshot + optional nodeIds", () => {
    expect(
      CreditsEstimateRequestSchema.parse({
        graph: {
          nodes: [{ id: "A", type: "gpt_image_2" }],
          edges: [],
        },
        nodeIds: ["A"],
      }),
    ).toMatchObject({
      nodeIds: ["A"],
      graph: { nodes: [{ id: "A", type: "gpt_image_2" }] },
    });
  });

  it("rejects neither or both of workflowId and graph", () => {
    expect(() => CreditsEstimateRequestSchema.parse({})).toThrow();
    expect(() =>
      CreditsEstimateRequestSchema.parse({
        workflowId: "wf_1",
        graph: { nodes: [], edges: [] },
      }),
    ).toThrow();
  });
});

describe("CreditsEstimateResponseSchema", () => {
  it("accepts total + perNode microcredits", () => {
    expect(
      CreditsEstimateResponseSchema.parse({
        total: 420_000,
        displayM: 0.42,
        perNode: [
          {
            nodeId: "A",
            type: "gpt_image_2",
            credits: 210_000,
            displayM: 0.21,
          },
          {
            nodeId: "B",
            type: "gpt_image_2",
            credits: 210_000,
            displayM: 0.21,
          },
        ],
      }),
    ).toMatchObject({ total: 420_000, perNode: { length: 2 } });
  });
});
