import { z } from "zod";
import type { NodeDefinition } from "../node-definition";

/**
 * Merge Videos — utility node (`merge_videos`).
 * Shaped from `docs/reference/screenshots/03-nodes/Merge_Videos.png` +
 * `docs/reference/node-inventory.md`.
 *
 * Primary: Videos* (multi URL array), Transition (shot: none).
 * Output: Merged Video (`out:result`).
 * Credits: ~0.04M.
 * Provider: real FFmpeg (`provider.kind: ffmpeg`) — not stubbed.
 */

/** Transition options visible in the product shot (only `none` captured). */
export const MERGE_VIDEOS_TRANSITIONS = ["none"] as const;

export const MergeVideosInputSchema = z.object({
  /** Required multi-input; Zod rejects fewer than 2 entries. */
  videos: z
    .array(z.string().min(1))
    .min(2, { message: "Merge Videos requires at least 2 videos" }),
  transition: z
    .string()
    .refine(
      (v): v is (typeof MERGE_VIDEOS_TRANSITIONS)[number] =>
        (MERGE_VIDEOS_TRANSITIONS as readonly string[]).includes(v),
      { message: "Transition must be one of: none" },
    )
    .default("none"),
});

export type MergeVideosInput = z.infer<typeof MergeVideosInputSchema>;

/** Product output handle is `out:result` (Merged Video) — single URL. */
export const MergeVideosOutputSchema = z.object({
  result: z.string().url().nullable().default(null),
});

export type MergeVideosOutput = z.infer<typeof MergeVideosOutputSchema>;

/** Magica inventory shows ~0.04M per merge. */
export function estimateMergeVideosCredits(_input?: unknown): number {
  return 0.04;
}

export const mergeVideosDefinition = {
  type: "merge_videos",
  label: "Merge Videos",
  category: "utility",
  input: MergeVideosInputSchema,
  output: MergeVideosOutputSchema,
  credits: { static: 0.04 },
  provider: { kind: "ffmpeg" as const, adapterId: "ffmpeg.merge_videos" },
  ui: {
    fields: [
      {
        key: "videos",
        control: "file" as const,
        label: "Videos",
        default: [],
      },
      {
        key: "transition",
        control: "select" as const,
        label: "Transition",
        default: "none",
        options: MERGE_VIDEOS_TRANSITIONS.map((value) => ({
          value,
          label: value,
        })),
      },
    ],
    handles: {
      inputs: [
        { id: "in:videos", label: "Videos", dataType: "video[]" },
        { id: "in:transition", label: "Transition", dataType: "string" },
      ],
      outputs: [
        {
          id: "out:result",
          label: "Merged Video",
          dataType: "video",
        },
      ],
    },
  },
} satisfies NodeDefinition;
