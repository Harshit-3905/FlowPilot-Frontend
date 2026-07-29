import { z } from "zod";
import type { NodeDefinition } from "../node-definition";

/**
 * GPT Image 2 — schema/UI only (no execution).
 * Shaped from Magica fixture `AI_Racing_Car_Generator_Copy.json` +
 * `docs/reference/node-inventory.md` (`gpt_image_2` UI shots).
 *
 * Primary: Prompt, Size, Quality, Number of Images.
 * Advanced (Settings): Background, Output Format, Output Compression.
 */

export const GptImage2InputSchema = z.object({
  prompt: z.string().max(4000).default(""),
  image_urls: z.array(z.string()).nullable().default(null),
  size: z.string().default("Auto"),
  quality: z.string().default("High"),
  n: z.number().int().min(1).max(10).default(1),
  background: z.string().default("Auto"),
  output_format: z.string().default("PNG"),
  output_compression: z.number().int().min(0).max(100).default(80),
});

export type GptImage2Input = z.infer<typeof GptImage2InputSchema>;

/** Product output handle is `out:result` (Generated Images). */
export const GptImage2OutputSchema = z.object({
  result: z.array(z.string()).default([]),
});

export type GptImage2Output = z.infer<typeof GptImage2OutputSchema>;

/**
 * Stub per-image cost in product `M` units.
 * Magica inventory shows ~0.21M at Quality=High, n=1.
 */
const GPT_IMAGE_2_CREDITS_PER_IMAGE: Record<string, number> = {
  High: 0.21,
  Medium: 0.14,
  Low: 0.07,
  Auto: 0.21,
};

/** Deterministic stub estimate: quality tier × number of images. */
export function estimateGptImage2Credits(input: unknown): number {
  const parsed = GptImage2InputSchema.parse(
    input === undefined || input === null ? {} : input,
  );
  const perImage = GPT_IMAGE_2_CREDITS_PER_IMAGE[parsed.quality] ?? 0.21;
  return Math.round(perImage * parsed.n * 1000) / 1000;
}

const textToImageInput = GptImage2InputSchema;
const imageToImageInput = GptImage2InputSchema.extend({
  image_urls: z.array(z.string()).default([]),
});

export const gptImage2Definition = {
  type: "gpt_image_2",
  label: "GPT Image 2",
  category: "image",
  input: GptImage2InputSchema,
  output: GptImage2OutputSchema,
  credits: { estimate: estimateGptImage2Credits },
  provider: { kind: "stub" as const, adapterId: "stub.gpt_image_2" },
  subModels: [
    {
      id: "gpt-image-2-text",
      label: "Text to Image",
      input: textToImageInput,
      output: GptImage2OutputSchema,
    },
    {
      id: "gpt-image-2-edit",
      label: "Image to Image",
      input: imageToImageInput,
      output: GptImage2OutputSchema,
    },
  ],
  ui: {
    fields: [
      {
        key: "prompt",
        control: "text" as const,
        label: "Prompt",
        default: "",
      },
      {
        key: "size",
        control: "select" as const,
        label: "Size",
        default: "Auto",
        options: [
          { value: "Auto", label: "Auto" },
          { value: "1024x1024", label: "1024×1024" },
          { value: "1536x1024", label: "1536×1024" },
          { value: "1024x1536", label: "1024×1536" },
        ],
      },
      {
        key: "image_urls",
        control: "file" as const,
        label: "Image URLs",
        default: null,
        advanced: true,
      },
      {
        key: "quality",
        control: "select" as const,
        label: "Quality",
        default: "High",
        options: [
          { value: "Auto", label: "Auto" },
          { value: "High", label: "High" },
          { value: "Medium", label: "Medium" },
          { value: "Low", label: "Low" },
        ],
      },
      {
        key: "n",
        control: "number" as const,
        label: "Number of Images",
        default: 1,
      },
      {
        key: "background",
        control: "select" as const,
        label: "Background",
        default: "Auto",
        advanced: true,
        options: [
          { value: "Auto", label: "Auto" },
          { value: "transparent", label: "Transparent" },
          { value: "white", label: "White" },
          { value: "black", label: "Black" },
        ],
      },
      {
        key: "output_format",
        control: "select" as const,
        label: "Output Format",
        default: "PNG",
        advanced: true,
        options: [
          { value: "PNG", label: "PNG" },
          { value: "JPEG", label: "JPEG" },
          { value: "WEBP", label: "WEBP" },
        ],
      },
      {
        key: "output_compression",
        control: "slider" as const,
        label: "Output Compression",
        default: 80,
        advanced: true,
      },
    ],
    handles: {
      inputs: [
        { id: "in:prompt", label: "Prompt", dataType: "string" },
        { id: "in:size", label: "Size", dataType: "string" },
        { id: "in:image_urls", label: "Image URLs", dataType: "image[]" },
        { id: "in:quality", label: "Quality", dataType: "string" },
        { id: "in:n", label: "Number of Images", dataType: "number" },
        { id: "in:background", label: "Background", dataType: "string" },
        { id: "in:output_format", label: "Output Format", dataType: "string" },
        {
          id: "in:output_compression",
          label: "Output Compression",
          dataType: "number",
        },
      ],
      outputs: [
        {
          id: "out:result",
          label: "Generated Images",
          dataType: "image[]",
        },
      ],
    },
  },
} satisfies NodeDefinition;
