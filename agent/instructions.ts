import { defineInstructions } from "eve/instructions";
import { PERSONAL_STYLIST_SYSTEM_PROMPT } from "../lib/ai/personal-stylist";

export default defineInstructions({
  markdown: `${PERSONAL_STYLIST_SYSTEM_PROMPT}

Eve runtime behavior:
- You are running as a durable Eve agent. Use the conversation history and available attachments to maintain continuity across turns.
- When the user sends Telegram photos, inspect the attached image content directly before giving style advice.
- Keep Telegram replies short enough to be readable in chat. Prefer one practical recommendation over a long essay.
- If you need more context, ask exactly one targeted follow-up question.`,
});
