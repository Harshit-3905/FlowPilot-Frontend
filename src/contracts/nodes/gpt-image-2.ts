import { z } from "zod";
import type { NodeDefinition } from "../node-definition";

/**
 * GPT Image 2 — registry definition + stub provider id.
 * Shaped from Magica fixture `AI_Racing_Car_Generator_Copy.json` +
 * `docs/reference/screenshots/03-nodes/GPT_Image_2_*.png` +
 * `docs/reference/node-inventory.md`.
 *
 * Modes: Text to Image | Image to Image (`subModels`).
 * Primary (T2I): Prompt*, Size, Quality, Number of Images.
 * Primary (I2I only): Image (`image_urls`, `subModelIds`).
 * Advanced (Settings): Background, Output Format, Output Compression.
 * Output: Generated Images (`out:result`).
 */

export const GPT_IMAGE_2_SIZES = [
  "Auto",
  "1024x1024",
  "1536x1024",
  "1024x1536",
] as const;

export const GPT_IMAGE_2_QUALITIES = [
  "Auto",
  "High",
  "Medium",
  "Low",
] as const;

export const GPT_IMAGE_2_BACKGROUNDS = [
  "Auto",
  "transparent",
  "white",
  "black",
] as const;

export const GPT_IMAGE_2_OUTPUT_FORMATS = ["PNG", "JPEG", "WEBP"] as const;

export const GptImage2InputSchema = z.object({
  prompt: z.string().max(4000).default(""),
  image_urls: z.array(z.string()).nullable().default(null),
  size: z.enum(GPT_IMAGE_2_SIZES).default("Auto"),
  quality: z.enum(GPT_IMAGE_2_QUALITIES).default("High"),
  n: z.number().int().min(1).max(10).default(1),
  background: z.enum(GPT_IMAGE_2_BACKGROUNDS).default("Auto"),
  output_format: z.enum(GPT_IMAGE_2_OUTPUT_FORMATS).default("PNG"),
  output_compression: z.number().int().min(0).max(100).default(80),
});

export type GptImage2Input = z.infer<typeof GptImage2InputSchema>;

/** Product output handle is `out:result` (Generated Images). */
export const GptImage2OutputSchema = z.object({
  result: z.array(z.string().url()).default([]),
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
        options: GPT_IMAGE_2_SIZES.map((value) => ({
          value,
          label: value === "Auto" ? "Auto" : value.replace("x", "×"),
        })),
      },
      {
        key: "quality",
        control: "select" as const,
        label: "Quality",
        default: "High",
        options: GPT_IMAGE_2_QUALITIES.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        key: "n",
        control: "number" as const,
        label: "Number of Images",
        default: 1,
      },
      {
        key: "image_urls",
        control: "file" as const,
        label: "Image",
        default: null,
        /** I2I only — hidden in Text to Image (matches T2I shots). */
        subModelIds: ["gpt-image-2-edit"],
      },
      {
        key: "background",
        control: "select" as const,
        label: "Background",
        default: "Auto",
        advanced: true,
        options: GPT_IMAGE_2_BACKGROUNDS.map((value) => ({
          value,
          label:
            value === "transparent"
              ? "Transparent"
              : value === "white"
                ? "White"
                : value === "black"
                  ? "Black"
                  : "Auto",
        })),
      },
      {
        key: "output_format",
        control: "select" as const,
        label: "Output Format",
        default: "PNG",
        advanced: true,
        options: GPT_IMAGE_2_OUTPUT_FORMATS.map((value) => ({
          value,
          label: value,
        })),
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
        { id: "in:quality", label: "Quality", dataType: "string" },
        { id: "in:n", label: "Number of Images", dataType: "number" },
        { id: "in:image_urls", label: "Image", dataType: "image[]" },
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
