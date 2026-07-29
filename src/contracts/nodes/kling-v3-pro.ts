import { z } from "zod";
import type { NodeDefinition } from "../node-definition";

/**
 * Kling v3 Pro — registry definition + stub provider id.
 * Shaped from `docs/reference/screenshots/03-nodes/Kling_v3_Pro.png` +
 * `docs/reference/node-inventory.md`.
 *
 * Modes: Text to Video | Image to Video (`subModels`).
 * Primary (T2V): Prompt*, Aspect Ratio, Duration, Negative Prompt, Generate Audio.
 * Primary (I2V only): Image (`image_url`, `subModelIds`).
 * Output: Generated Video (`out:result`).
 * Credits: ~0.84M.
 */

export const KLING_V3_PRO_ASPECT_RATIOS = ["16:9", "9:16", "1:1"] as const;

export const KLING_V3_PRO_DURATIONS = [5, 10] as const;

export const KlingV3ProInputSchema = z.object({
  prompt: z.string().max(2500).default(""),
  image_url: z.string().nullable().default(null),
  aspect_ratio: z
    .string()
    .refine(
      (v): v is (typeof KLING_V3_PRO_ASPECT_RATIOS)[number] =>
        (KLING_V3_PRO_ASPECT_RATIOS as readonly string[]).includes(v),
      { message: "Aspect ratio must be one of: 16:9, 9:16, 1:1" },
    )
    .default("16:9"),
  /** Product dropdown; select control may yield string — coerce then limit-check. */
  duration: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z
      .number({ error: "Duration must be a number" })
      .int()
      .refine(
        (n): n is (typeof KLING_V3_PRO_DURATIONS)[number] =>
          (KLING_V3_PRO_DURATIONS as readonly number[]).includes(n),
        { message: "Duration must be 5 or 10 seconds" },
      )
      .default(5),
  ),
  negative_prompt: z.string().max(2500).default(""),
  generate_audio: z.boolean().default(false),
});

export type KlingV3ProInput = z.infer<typeof KlingV3ProInputSchema>;

/** Product output handle is `out:result` (Generated Video) — single URL. */
export const KlingV3ProOutputSchema = z.object({
  result: z.string().url().nullable().default(null),
});

export type KlingV3ProOutput = z.infer<typeof KlingV3ProOutputSchema>;

/** Magica inventory shows ~0.84M per generation. */
export function estimateKlingV3ProCredits(_input?: unknown): number {
  return 0.84;
}

const textToVideoInput = KlingV3ProInputSchema;
const imageToVideoInput = KlingV3ProInputSchema.extend({
  image_url: z.string().default(""),
});

export const klingV3ProDefinition = {
  type: "kling_v3_pro",
  label: "Kling v3 Pro",
  category: "video",
  input: KlingV3ProInputSchema,
  output: KlingV3ProOutputSchema,
  credits: { static: 0.84 },
  limits: { maxDurationSec: 10 },
  provider: { kind: "stub" as const, adapterId: "stub.kling_v3_pro" },
  subModels: [
    {
      id: "kling-v3-pro-text-to-video",
      label: "Text to Video",
      input: textToVideoInput,
      output: KlingV3ProOutputSchema,
    },
    {
      id: "kling-v3-pro-image-to-video",
      label: "Image to Video",
      input: imageToVideoInput,
      output: KlingV3ProOutputSchema,
    },
  ],
  ui: {
    fields: [
      {
        key: "image_url",
        control: "file" as const,
        label: "Image",
        default: null,
        /** I2V only — hidden in Text to Video (matches T2V shot). */
        subModelIds: ["kling-v3-pro-image-to-video"],
      },
      {
        key: "prompt",
        control: "text" as const,
        label: "Prompt",
        default: "",
      },
      {
        key: "aspect_ratio",
        control: "select" as const,
        label: "Aspect Ratio",
        default: "16:9",
        options: KLING_V3_PRO_ASPECT_RATIOS.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        key: "duration",
        control: "select" as const,
        label: "Duration",
        default: 5,
        options: KLING_V3_PRO_DURATIONS.map((value) => ({
          value: String(value),
          label: String(value),
        })),
      },
      {
        key: "negative_prompt",
        control: "text" as const,
        label: "Negative Prompt",
        default: "",
      },
      {
        key: "generate_audio",
        control: "switch" as const,
        label: "Generate Audio",
        default: false,
      },
    ],
    handles: {
      inputs: [
        { id: "in:image_url", label: "Image", dataType: "image" },
        { id: "in:prompt", label: "Prompt", dataType: "string" },
        { id: "in:aspect_ratio", label: "Aspect Ratio", dataType: "string" },
        { id: "in:duration", label: "Duration", dataType: "number" },
        {
          id: "in:negative_prompt",
          label: "Negative Prompt",
          dataType: "string",
        },
        {
          id: "in:generate_audio",
          label: "Generate Audio",
          dataType: "boolean",
        },
      ],
      outputs: [
        {
          id: "out:result",
          label: "Generated Video",
          dataType: "video",
        },
      ],
    },
  },
} satisfies NodeDefinition;
