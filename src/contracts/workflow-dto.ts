import { z } from "zod";

export const WorkflowGraphSchema = z.object({
  nodes: z.array(z.record(z.string(), z.unknown())).default([]),
  edges: z.array(z.record(z.string(), z.unknown())).default([]),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .default({ x: 0, y: 0, zoom: 1 }),
});

export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>;

const WorkflowSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  updatedAt: z.string().datetime(),
});

export const CreateWorkflowResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  graph: WorkflowGraphSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CreateWorkflowResponse = z.infer<
  typeof CreateWorkflowResponseSchema
>;

export const ListWorkflowsResponseSchema = z.object({
  workflows: z.array(WorkflowSummarySchema),
});

export type ListWorkflowsResponse = z.infer<typeof ListWorkflowsResponseSchema>;

export const WorkflowDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  graph: WorkflowGraphSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WorkflowDetailResponse = z.infer<
  typeof WorkflowDetailResponseSchema
>;

export const UpdateWorkflowBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    graph: WorkflowGraphSchema.optional(),
  })
  .refine((d) => d.name !== undefined || d.graph !== undefined, {
    message: "At least one of name or graph is required",
  });

export type UpdateWorkflowBody = z.infer<typeof UpdateWorkflowBodySchema>;
