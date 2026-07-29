import { z } from "zod";
import { gptImage2Definition } from "./nodes/gpt-image-2";

/** UI control kinds for `ui.fields` (extend as real nodes land). */
export const UiControlSchema = z.enum([
  "text",
  "number",
  "select",
  "slider",
  "switch",
  "file",
]);

export type UiControl = z.infer<typeof UiControlSchema>;

export const UiFieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export type UiFieldOption = z.infer<typeof UiFieldOptionSchema>;

export const UiFieldSchema = z.object({
  key: z.string().min(1),
  control: UiControlSchema,
  label: z.string().min(1),
  default: z.unknown().optional(),
  advanced: z.boolean().optional(),
  /** Required when control === "select". */
  options: z.array(UiFieldOptionSchema).optional(),
});

export type UiField = z.infer<typeof UiFieldSchema>;

/**
 * Handle descriptors. Product exports use `in:<key>` / `out:<key>`
 * (plus specials like `result` / `field_*` on request/response — later slices).
 */
export const HandleDescriptorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  dataType: z.string().min(1),
});

export type HandleDescriptor = z.infer<typeof HandleDescriptorSchema>;

export const UiHandlesSchema = z.object({
  inputs: z.array(HandleDescriptorSchema),
  outputs: z.array(HandleDescriptorSchema),
});

export type UiHandles = z.infer<typeof UiHandlesSchema>;

export const NodeUiSchema = z.object({
  fields: z.array(UiFieldSchema),
  handles: UiHandlesSchema,
});

export type NodeUi = z.infer<typeof NodeUiSchema>;

export const NodeLimitsSchema = z.object({
  maxFileSize: z.number().nonnegative().optional(),
  maxDurationSec: z.number().nonnegative().optional(),
});

export type NodeLimits = z.infer<typeof NodeLimitsSchema>;

export const NodeProviderSchema = z.object({
  kind: z.enum(["stub", "ffmpeg", "openrouter"]),
  adapterId: z.string().min(1),
});

export type NodeProvider = z.infer<typeof NodeProviderSchema>;

/** Runtime check: value looks like a Zod schema (`parse` present). */
export const ZodTypeAnySchema = z.custom<z.ZodTypeAny>(
  (val) =>
    val != null &&
    typeof val === "object" &&
    typeof (val as z.ZodTypeAny).parse === "function",
  { message: "Expected a Zod schema" },
);

/**
 * Per-node credit metadata: fixed cost or input-dependent estimate.
 * Units match product display (`M`); see `estimateCredits`.
 */
export type CreditsMetadata =
  | { static: number }
  | { estimate: (input: unknown) => number };

export const CreditsMetadataSchema = z.union([
  z.object({ static: z.number() }),
  z.object({ estimate: z.custom<(input: unknown) => number>(
    (val) => typeof val === "function",
    { message: "Expected estimate function" },
  ) }),
]);

export type NodeSubModel = {
  id: string;
  label: string;
  input: z.ZodTypeAny;
  output: z.ZodTypeAny;
};

export const NodeSubModelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  input: ZodTypeAnySchema,
  output: ZodTypeAnySchema,
});

/**
 * Full node definition: Zod I/O + UI config + optional metadata.
 * Settings live in `node.data.inputs`; handle ids follow `in:` / `out:`.
 */
export type NodeDefinition = {
  type: string;
  label: string;
  category: string;
  input: z.ZodTypeAny;
  output: z.ZodTypeAny;
  ui: NodeUi;
  credits?: CreditsMetadata;
  subModels?: NodeSubModel[];
  limits?: NodeLimits;
  provider?: NodeProvider;
};

export const NodeDefinitionSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1),
  category: z.string().min(1),
  input: ZodTypeAnySchema,
  output: ZodTypeAnySchema,
  ui: NodeUiSchema,
  credits: CreditsMetadataSchema.optional(),
  subModels: z.array(NodeSubModelSchema).optional(),
  limits: NodeLimitsSchema.optional(),
  provider: NodeProviderSchema.optional(),
});

/** Registry — add nodes by importing a definition file and assigning here. */
export const nodeRegistry: Record<string, NodeDefinition> = {
  [gptImage2Definition.type]: gptImage2Definition,
};

export function getNode(type: string): NodeDefinition | undefined {
  return nodeRegistry[type];
}

export function listNodes(): NodeDefinition[] {
  return Object.values(nodeRegistry);
}
