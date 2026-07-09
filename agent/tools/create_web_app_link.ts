import { defineTool } from "eve/tools";
import { z } from "zod";
import { createMiraWebUrl } from "../../lib/mira-web-links";
import { resolveTelegramIdFromAuth } from "../../lib/style-profiles";

export default defineTool({
  description:
    "Create a secure web app link for the current Telegram user. Use when the user asks to open the app, dashboard, profile, saved style details, or recommendations in the browser.",
  inputSchema: z.object({
    expiresInDays: z
      .number()
      .int()
      .min(1)
      .max(365)
      .optional()
      .describe("How many days the web app link should remain valid."),
  }),
  async execute({ expiresInDays }, ctx) {
    const telegramId = resolveTelegramIdFromAuth(ctx.session.auth.current);

    if (!telegramId) {
      return {
        ok: false as const,
        error: "No Telegram user id on this session.",
      };
    }

    const url = createMiraWebUrl(telegramId, { expiresInDays });

    return {
      ok: true as const,
      url,
      expiresInDays: expiresInDays ?? 30,
    };
  },
});
