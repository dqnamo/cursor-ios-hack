import { defineDynamic, defineInstructions } from "eve/instructions";
import {
  formatStyleMemoryForPrompt,
  getStyleMemory,
  resolveTelegramIdFromAuth,
} from "../../lib/style-profiles";

export default defineDynamic({
  events: {
    "turn.started": async (_event, ctx) => {
      const telegramId = resolveTelegramIdFromAuth(ctx.session.auth.current);

      if (!telegramId) {
        return defineInstructions({
          markdown: `## Style memory
No Telegram user id is available on this turn. Give general styling advice and ask the user to share vibe, budget, and values in chat so you can remember them next time.`,
        });
      }

      try {
        const memory = await getStyleMemory(telegramId);

        return defineInstructions({
          markdown: `## Style memory for Telegram user ${telegramId}
Use this saved profile when giving advice. Prefer it over assumptions.
If a field is missing and it would change the recommendation, ask exactly one follow-up.
When the user shares new preferences, call update_style_profile or remember_style_note before finishing the reply.

${formatStyleMemoryForPrompt(memory)}`,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown InstantDB error";

        return defineInstructions({
          markdown: `## Style memory
Could not load the saved style profile (${message}). Continue with styling advice from the current message, and retry get_style_profile later if needed.`,
        });
      }
    },
  },
});
