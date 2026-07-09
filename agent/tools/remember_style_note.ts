import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  appendStyleNote,
  resolveTelegramIdFromAuth,
} from "../../lib/style-profiles";

export default defineTool({
  description:
    "Append a durable style memory note from this conversation, such as a photo takeaway or a preference the user confirmed. Prefer this for incremental learning; use update_style_profile for structured fields.",
  inputSchema: z.object({
    note: z
      .string()
      .min(1)
      .describe("Short concrete note to remember, one idea per call."),
    source: z
      .enum(["photo", "text", "other"])
      .optional()
      .describe("Where the note came from."),
  }),
  async execute({ note, source }, ctx) {
    const telegramId = resolveTelegramIdFromAuth(ctx.session.auth.current);

    if (!telegramId) {
      return {
        ok: false as const,
        error: "No Telegram user id on this session.",
      };
    }

    const memory = await appendStyleNote(telegramId, note, source ?? "text");

    return {
      ok: true as const,
      profile: memory.profile,
      recentRefs: memory.recentRefs,
    };
  },
});
