import { defineDynamic, defineInstructions } from "eve/instructions";
import {
  formatStyleMemoryForPrompt,
  getStyleMemory,
  resolveTelegramIdFromAuth,
  updateStyleProfile,
} from "../../lib/style-profiles";

export default defineDynamic({
  events: {
    "turn.started": async (_event, ctx) => {
      const telegramId = resolveTelegramIdFromAuth(ctx.session.auth.current);

      if (!telegramId) {
        return defineInstructions({
          markdown: `## Style memory
No Telegram user id is available on this turn. Give general styling advice and ask the user to share a selfie first so you can get to know their look.`,
        });
      }

      try {
        let memory = await getStyleMemory(telegramId);

        // Ensure every Telegram user has a profile row so introStep can advance.
        if (memory.isNew) {
          await updateStyleProfile(telegramId, { introStep: "selfie" });
          memory = await getStyleMemory(telegramId);
        }

        return defineInstructions({
          markdown: `## Style memory for Telegram user ${telegramId}
Use this saved profile when giving advice. Prefer it over assumptions.
Follow the INTRO FLOW guidance exactly while onboarding is incomplete.
When the user shares new preferences, call update_style_profile or remember_style_note before finishing the reply.

${formatStyleMemoryForPrompt(memory)}`,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown InstantDB error";

        return defineInstructions({
          markdown: `## Style memory
Could not load the saved style profile (${message}). Stay casual, ask for a selfie if this seems like a first hello, and retry get_style_profile later if needed.`,
        });
      }
    },
  },
});
