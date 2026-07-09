import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getStyleMemory,
  resolveTelegramIdFromAuth,
} from "../../lib/style-profiles";

export default defineTool({
  description:
    "Load the user's saved style profile and recent style notes from InstantDB. Call this when you need to refresh memory or confirm what is already known.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const telegramId = resolveTelegramIdFromAuth(ctx.session.auth.current);

    if (!telegramId) {
      return {
        ok: false as const,
        error: "No Telegram user id on this session.",
      };
    }

    const memory = await getStyleMemory(telegramId);

    return {
      ok: true as const,
      telegramId,
      isNew: memory.isNew,
      profile: memory.profile,
      recentRefs: memory.recentRefs,
    };
  },
});
