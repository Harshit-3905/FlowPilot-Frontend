import { z } from "zod";
import type { NodeDefinition } from "../node-definition";

/**
 * Seedance 2.0 — registry definition + stub provider id.
 * Shaped from `docs/reference/screenshots/03-nodes/Seedance_2.0_image_to_video_plus_Response.png`,
 * fixture `AI_Racing_Car_Generator_Copy.json`, and `docs/reference/node-inventory.md`.
 *
 * Modes: Text to Video | Image to Video (`subModels`).
 * Primary (I2V): Image*, Prompt*, End Frame Image, Duration, Aspect Ratio,
 * Resolution, Generate Audio.
 * Output: Generated Video (`out:result`).
 * Credits: ~1.51M.
 */

export const SEEDANCE_2_0_ASPECT_RATIOS = ["16:9", "9:16", "1:1"] as const;

export const SEEDANCE_2_0_DURATIONS = [5, 10] as const;

export const SEEDANCE_2_0_RESOLUTIONS = ["480p", "720p", "1080p"] as const;

export const Seedance20InputSchema = z.object({
  prompt: z.string().max(2500).default(""),
  image_url: z.string().nullable().default(null),
  end_image_url: z.string().nullable().default(null),
  aspect_ratio: z
    .string()
    .refine(
      (v): v is (typeof SEEDANCE_2_0_ASPECT_RATIOS)[number] =>
        (SEEDANCE_2_0_ASPECT_RATIOS as readonly string[]).includes(v),
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
        (n): n is (typeof SEEDANCE_2_0_DURATIONS)[number] =>
          (SEEDANCE_2_0_DURATIONS as readonly number[]).includes(n),
        { message: "Duration must be 5 or 10 seconds" },
      )
      .default(5),
  ),
  resolution: z
    .string()
    .refine(
      (v): v is (typeof SEEDANCE_2_0_RESOLUTIONS)[number] =>
        (SEEDANCE_2_0_RESOLUTIONS as readonly string[]).includes(v),
      { message: "Resolution must be one of: 480p, 720p, 1080p" },
    )
    .default("720p"),
  generate_audio: z.boolean().default(true),
});

export type Seedance20Input = z.infer<typeof Seedance20InputSchema>;

/** Product output handle is `out:result` (Generated Video) — single URL. */
export const Seedance20OutputSchema = z.object({
  result: z.string().url().nullable().default(null),
});

export type Seedance20Output = z.infer<typeof Seedance20OutputSchema>;

/** Magica inventory shows ~1.51M per generation. */
export function estimateSeedance20Credits(_input?: unknown): number {
  return 1.51;
}

const textToVideoInput = Seedance20InputSchema;
const imageToVideoInput = Seedance20InputSchema.extend({
  image_url: z.string().default(""),
});

export const seedance20Definition = {
  type: "seedance_2_0",
  label: "Seedance 2.0",
  category: "video",
  input: Seedance20InputSchema,
  output: Seedance20OutputSchema,
  credits: { static: 1.51 },
  limits: { maxDurationSec: 10 },
  provider: { kind: "stub" as const, adapterId: "stub.seedance_2_0" },
  subModels: [
    {
      id: "seedance-2.0-text-to-video",
      label: "Text to Video",
      input: textToVideoInput,
      output: Seedance20OutputSchema,
    },
    {
      id: "seedance-2.0-image-to-video",
      label: "Image to Video",
      input: imageToVideoInput,
      output: Seedance20OutputSchema,
    },
  ],
  ui: {
    fields: [
      {
        key: "image_url",
        control: "file" as const,
        label: "Image",
        default: null,
        /** I2V only — hidden in Text to Video. */
        subModelIds: ["seedance-2.0-image-to-video"],
      },
      {
        key: "prompt",
        control: "text" as const,
        label: "Prompt",
        default: "",
      },
      {
        key: "end_image_url",
        control: "file" as const,
        label: "End Frame Image",
        default: null,
        subModelIds: ["seedance-2.0-image-to-video"],
      },
      {
        key: "duration",
        control: "select" as const,
        label: "Duration",
        default: 5,
        options: SEEDANCE_2_0_DURATIONS.map((value) => ({
          value: String(value),
          label: String(value),
        })),
      },
      {
        key: "aspect_ratio",
        control: "select" as const,
        label: "Aspect Ratio",
        default: "16:9",
        options: SEEDANCE_2_0_ASPECT_RATIOS.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        key: "resolution",
        control: "select" as const,
        label: "Resolution",
        default: "720p",
        options: SEEDANCE_2_0_RESOLUTIONS.map((value) => ({
          value,
          label: value,
        })),
      },
      {
        key: "generate_audio",
        control: "switch" as const,
        label: "Generate Audio",
        default: true,
      },
    ],
    handles: {
      inputs: [
        { id: "in:image_url", label: "Image", dataType: "image" },
        { id: "in:prompt", label: "Prompt", dataType: "string" },
        {
          id: "in:end_image_url",
          label: "End Frame Image",
          dataType: "image",
        },
        { id: "in:duration", label: "Duration", dataType: "number" },
        { id: "in:aspect_ratio", label: "Aspect Ratio", dataType: "string" },
        { id: "in:resolution", label: "Resolution", dataType: "string" },
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
