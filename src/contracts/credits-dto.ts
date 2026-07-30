import { z } from "zod";
import { WorkflowGraphSchema } from "./workflow-dto";

/**
 * Credit amounts on the wire are integer **microcredits**
 * (1 displayed M = 1_000_000). Optional `displayM` is a convenience
 * float for UI (balance ÷ 1e6).
 */

/** `GET /api/v1/credits` success body. */
export const CreditsBalanceResponseSchema = z.object({
  balance: z.number().int(),
  displayM: z.number().optional(),
});

export type CreditsBalanceResponse = z.infer<
  typeof CreditsBalanceResponseSchema
>;

/** One append-only ledger row. */
export const CreditLedgerEntrySchema = z.object({
  id: z.string().min(1),
  amount: z.number().int(),
  balanceAfter: z.number().int(),
  reason: z.string().min(1),
  runId: z.string().nullable(),
  runNodeId: z.string().nullable(),
  createdAt: z.string().datetime(),
  /** Convenience: `amount` in displayed M units. */
  displayM: z.number().optional(),
});

export type CreditLedgerEntry = z.infer<typeof CreditLedgerEntrySchema>;

/** `GET /api/v1/credits/ledger` success body (newest-first). */
export const CreditLedgerListResponseSchema = z.object({
  entries: z.array(CreditLedgerEntrySchema),
  nextCursor: z.string().nullable(),
});

export type CreditLedgerListResponse = z.infer<
  typeof CreditLedgerListResponseSchema
>;

/** Query for `GET /api/v1/credits/ledger`. */
export const CreditLedgerQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export type CreditLedgerQuery = z.infer<typeof CreditLedgerQuerySchema>;

/**
 * `POST /api/v1/credits/estimate` body.
 * Provide exactly one of `workflowId` (server loads owned graph) or `graph` snapshot.
 * Optional `nodeIds` scopes the sum (single-node / future group runs).
 */
export const CreditsEstimateRequestSchema = z
  .object({
    workflowId: z.string().min(1).optional(),
    graph: WorkflowGraphSchema.optional(),
    nodeIds: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (d) =>
      (d.workflowId !== undefined) !== (d.graph !== undefined),
    { message: "Provide exactly one of workflowId or graph" },
  );

export type CreditsEstimateRequest = z.infer<
  typeof CreditsEstimateRequestSchema
>;

/** One node’s estimate in an estimate response. */
export const CreditsEstimatePerNodeSchema = z.object({
  nodeId: z.string().min(1),
  type: z.string().min(1),
  /** Integer microcredits. */
  credits: z.number().int(),
  /** Convenience: `credits` in displayed M units. */
  displayM: z.number().optional(),
});

export type CreditsEstimatePerNode = z.infer<
  typeof CreditsEstimatePerNodeSchema
>;

/** `POST /api/v1/credits/estimate` success body. */
export const CreditsEstimateResponseSchema = z.object({
  /** Sum of per-node estimates (integer microcredits). */
  total: z.number().int(),
  displayM: z.number().optional(),
  perNode: z.array(CreditsEstimatePerNodeSchema),
});

export type CreditsEstimateResponse = z.infer<
  typeof CreditsEstimateResponseSchema
>;
