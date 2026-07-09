import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  INTRO_STEPS,
  resolveTelegramIdFromAuth,
  updateStyleProfile,
} from "../../lib/style-profiles";

export default defineTool({
  description:
    "Create or update the user's durable style profile. Use when they share vibe, budget, values, preferred/avoided brands, sizing, lifestyle, or when advancing the casual intro flow. Only include fields that should change. Set introStep as they complete each intro stage: selfie -> vibe_values -> budget -> done.",
  inputSchema: z.object({
    vibe: z
      .string()
      .min(1)
      .optional()
      .describe("Aesthetic direction, e.g. quiet luxury, workwear, street."),
    budget: z
      .string()
      .min(1)
      .optional()
      .describe("Budget band or monthly spend, in the user's words."),
    values: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Ethics and shopping values, e.g. small makers, no fast fashion.",
      ),
    preferredBrands: z
      .string()
      .min(1)
      .optional()
      .describe("Comma-separated or short list of brands to prefer."),
    avoidedBrands: z
      .string()
      .min(1)
      .optional()
      .describe("Comma-separated or short list of brands to avoid."),
    sizingNotes: z
      .string()
      .min(1)
      .optional()
      .describe("Fit and sizing preferences."),
    lifestyle: z
      .string()
      .min(1)
      .optional()
      .describe("Day-to-day context: office, travel, gym, climate, etc."),
    notes: z
      .string()
      .min(1)
      .optional()
      .describe("Freeform durable notes that should replace the notes field."),
    introStep: z
      .enum(INTRO_STEPS)
      .optional()
      .describe("Casual intro progress: selfie, vibe_values, budget, or done."),
    onboardingComplete: z
      .boolean()
      .optional()
      .describe("Set true once vibe, budget, and values are known enough."),
  }),
  async execute(input, ctx) {
    const telegramId = resolveTelegramIdFromAuth(ctx.session.auth.current);

    if (!telegramId) {
      return {
        ok: false as const,
        error: "No Telegram user id on this session.",
      };
    }

    const hasPatch = Object.values(input).some((value) => value !== undefined);

    if (!hasPatch) {
      return {
        ok: false as const,
        error: "Provide at least one profile field to update.",
      };
    }

    const result = await updateStyleProfile(telegramId, input);

    return {
      ok: true as const,
      created: result.created,
      introStep: result.introStep,
      profile: result.profile,
    };
  },
});
