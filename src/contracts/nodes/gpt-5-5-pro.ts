import { z } from "zod";
import type { NodeDefinition } from "../node-definition";

/**
 * GPT 5.5 Pro — OpenRouter-shaped LLM leaf (`gpt_5_5_pro`).
 * Shaped from `docs/reference/screenshots/03-nodes/GPT_5.5_Pro.png`,
 * fixture `AI_Racing_Car_Generator_Copy.json`, and
 * `docs/reference/node-inventory.md`.
 *
 * Primary: Prompt*, System Prompt, Image (Vision).
 * Advanced (Settings): sampling / penalty / format knobs from fixture.
 * Output: Response (`out:output` text).
 * Credits: ~0.0001M.
 */

export const Gpt55ProInputSchema = z.object({
  prompt: z.string().max(100_000).default(""),
  system_prompt: z.string().max(100_000).default(""),
  image_urls: z.array(z.string()).default([]),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().int().min(1).max(128_000).default(1024),
  top_p: z.number().min(0).max(1).default(1),
  top_k: z.number().int().min(0).default(0),
  min_p: z.number().min(0).max(1).default(0),
  top_a: z.number().min(0).default(0),
  presence_penalty: z.number().min(-2).max(2).default(0),
  frequency_penalty: z.number().min(-2).max(2).default(0),
  repetition_penalty: z.number().min(0).max(2).default(1),
  stop: z.string().default(""),
  seed: z.number().int().nullable().default(null),
  reasoning: z.boolean().default(false),
  response_format: z.boolean().default(false),
});

export type Gpt55ProInput = z.infer<typeof Gpt55ProInputSchema>;

/** Product output handle is `out:output` (Response) — plain text. */
export const Gpt55ProOutputSchema = z.object({
  output: z.string().default(""),
});

export type Gpt55ProOutput = z.infer<typeof Gpt55ProOutputSchema>;

/** Magica inventory shows ~0.0001M per call. */
export function estimateGpt55ProCredits(_input?: unknown): number {
  return 0.0001;
}

export const gpt55ProDefinition = {
  type: "gpt_5_5_pro",
  label: "GPT 5.5 Pro",
  category: "text",
  input: Gpt55ProInputSchema,
  output: Gpt55ProOutputSchema,
  credits: { static: 0.0001 },
  provider: { kind: "openrouter" as const, adapterId: "stub.gpt_5_5_pro" },
  ui: {
    fields: [
      {
        key: "prompt",
        control: "text" as const,
        label: "Prompt",
        default: "",
      },
      {
        key: "system_prompt",
        control: "text" as const,
        label: "System Prompt",
        default: "",
      },
      {
        key: "image_urls",
        control: "file" as const,
        label: "Image (Vision)",
        default: [],
      },
      {
        key: "temperature",
        control: "slider" as const,
        label: "Temperature",
        default: 0.7,
        advanced: true,
      },
      {
        key: "max_tokens",
        control: "number" as const,
        label: "Max Tokens",
        default: 1024,
        advanced: true,
      },
      {
        key: "top_p",
        control: "slider" as const,
        label: "Top P",
        default: 1,
        advanced: true,
      },
      {
        key: "top_k",
        control: "number" as const,
        label: "Top K",
        default: 0,
        advanced: true,
      },
      {
        key: "min_p",
        control: "slider" as const,
        label: "Min P",
        default: 0,
        advanced: true,
      },
      {
        key: "top_a",
        control: "slider" as const,
        label: "Top A",
        default: 0,
        advanced: true,
      },
      {
        key: "presence_penalty",
        control: "slider" as const,
        label: "Presence Penalty",
        default: 0,
        advanced: true,
      },
      {
        key: "frequency_penalty",
        control: "slider" as const,
        label: "Frequency Penalty",
        default: 0,
        advanced: true,
      },
      {
        key: "repetition_penalty",
        control: "slider" as const,
        label: "Repetition Penalty",
        default: 1,
        advanced: true,
      },
      {
        key: "stop",
        control: "text" as const,
        label: "Stop",
        default: "",
        advanced: true,
      },
      {
        key: "seed",
        control: "number" as const,
        label: "Seed",
        default: null,
        advanced: true,
      },
      {
        key: "reasoning",
        control: "switch" as const,
        label: "Reasoning",
        default: false,
        advanced: true,
      },
      {
        key: "response_format",
        control: "switch" as const,
        label: "Response Format",
        default: false,
        advanced: true,
      },
    ],
    handles: {
      inputs: [
        { id: "in:prompt", label: "Prompt", dataType: "string" },
        { id: "in:system_prompt", label: "System Prompt", dataType: "string" },
        { id: "in:image_urls", label: "Image (Vision)", dataType: "image[]" },
        { id: "in:temperature", label: "Temperature", dataType: "number" },
        { id: "in:max_tokens", label: "Max Tokens", dataType: "number" },
        { id: "in:top_p", label: "Top P", dataType: "number" },
        { id: "in:top_k", label: "Top K", dataType: "number" },
        { id: "in:min_p", label: "Min P", dataType: "number" },
        { id: "in:top_a", label: "Top A", dataType: "number" },
        {
          id: "in:presence_penalty",
          label: "Presence Penalty",
          dataType: "number",
        },
        {
          id: "in:frequency_penalty",
          label: "Frequency Penalty",
          dataType: "number",
        },
        {
          id: "in:repetition_penalty",
          label: "Repetition Penalty",
          dataType: "number",
        },
        { id: "in:stop", label: "Stop", dataType: "string" },
        { id: "in:seed", label: "Seed", dataType: "number" },
        { id: "in:reasoning", label: "Reasoning", dataType: "boolean" },
        {
          id: "in:response_format",
          label: "Response Format",
          dataType: "boolean",
        },
      ],
      outputs: [
        {
          id: "out:output",
          label: "Response",
          dataType: "string",
        },
      ],
    },
  },
} satisfies NodeDefinition;
