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
No Telegram user id. Keep it short. Ask for a selfie for undertone/colors if this feels like a first hello.`,
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
          markdown: `## Style memory
Use this. Don't invent facts. Follow INTRO if incomplete. Save new prefs with tools.
Keep replies short and human.

${formatStyleMemoryForPrompt(memory)}`,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown InstantDB error";

        return defineInstructions({
          markdown: `## Style memory
Couldn't load profile (${message}). Stay short and human. Ask for a selfie for undertone/colors if needed.`,
        });
      }
    },
  },
});
