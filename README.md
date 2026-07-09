# Dqnamo Stylist

A personal stylist assistant using Next.js, Eve, InstantDB, and Telegram.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy the variables from `.env.example` into `.env.local` and fill them in:

- `NEXT_PUBLIC_INSTANT_APP_ID` from InstantDB
- `INSTANT_APP_ADMIN_TOKEN` from InstantDB for server-side writes
- `TELEGRAM_BOT_TOKEN` from BotFather
- `TELEGRAM_BOT_USERNAME` without the leading `@`
- `TELEGRAM_WEBHOOK_SECRET_TOKEN` Telegram webhook `secret_token`
- `AI_GATEWAY_API_KEY` for local Eve model calls outside Vercel OIDC

Eve requires Node.js 24 or newer.

## Eve Tools

The stylist agent has access to these tools:

### Style Profile Tools
- **get_style_profile** - Load the user's saved style profile and recent notes
- **update_style_profile** - Update vibe, budget, values, brands, sizing, lifestyle
- **remember_style_note** - Save short durable takeaways from photos and chat

### Shopping Tool
- **search_shopping** - Prepare web searches for shopping by incorporating the user's values, budget, and brand preferences

When a user asks for shopping recommendations (e.g., "I need summer clothes"), the stylist:
1. Calls `search_shopping` to build a profile-aware query
2. Uses Eve's built-in `web_search` tool with the enhanced query
3. Filters results to exclude avoided brands
4. Returns curated picks matching their values and budget

### Telegram UI Features

The Telegram channel includes custom formatting for a better user experience:

- **Markdown formatting** - Messages use bold, emphasis, and clean layout
- **Inline keyboard buttons** - Shopping links automatically become tappable buttons
- **Smart button labels** - Extracts context-aware labels from surrounding text
- **Auto-detection** - Recognizes shopping results (1-6 URLs) and formats accordingly

Example: When the agent shares 3 shopping links, users see a formatted message with 3 inline buttons they can tap to visit each store directly.

The `search_shopping` tool automatically:
- Incorporates their values (e.g., sustainable, ethical)
- Respects their budget
- Prefers their preferred brands
- Provides guidance to filter out avoided brands

### Built-in Eve Tools
The agent also has access to Eve's default tools including:
- `web_search` - Search the web (provider-managed by the AI model)
- `web_fetch` - Fetch content from URLs
- `bash`, `read_file`, `write_file`, `glob`, `grep` - Sandbox file operations
- `todo` - Maintain a durable task list
- `ask_question` - Ask the user clarifying questions

## Eve

The personal stylist agent lives in `/agent`:

- `agent/agent.ts` selects the AI Gateway model.
- `agent/instructions.ts` loads the stylist prompt.
- `agent/channels/telegram.ts` exposes the Telegram bot channel at
  `POST /eve/v1/telegram` and accepts image uploads.

## InstantDB

The starter schema and permissions live in `instant.schema.ts` and
`instant.perms.ts`.

Style memory lives in InstantDB:

- `styleProfiles` stores vibe, budget, values, brand preferences, sizing,
  lifestyle, intro step, and freeform notes, keyed by Telegram user id.
- `styleRefs` stores short durable takeaways from photos and chat.
- Eve tools `get_style_profile`, `update_style_profile`, and
  `remember_style_note` read and write that memory.
- Dynamic instructions in `agent/instructions/style_memory.ts` inject the
  saved profile and casual intro-flow guidance into each turn.
- Intro flow is selfie (undertone/colors) → liked clothes pics → taste/values →
  budget, as separate short, warm, non-creepy messages (stylist/friend tone).

Push the schema after pulling these changes:

```bash
npx instant-cli@latest push schema
npx instant-cli@latest push perms
```

## Telegram webhook

Incoming Telegram bot messages are handled by Eve at `POST /eve/v1/telegram`.
The channel also creates or updates InstantDB `telegramUsers` records before
dispatching the turn to the stylist agent. It uses the sender's Telegram id as a
unique key, so every later message updates the same record. Photo messages are
marked with `lastMessageKind: "photo"` and the largest Telegram photo size's
`file_id` is stored as `lastPhotoFileId`.

Set the Eve assistant webhook URL with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-app.example.com/eve/v1/telegram",
       "secret_token":"'"$TELEGRAM_WEBHOOK_SECRET_TOKEN"'",
       "allowed_updates":["message","callback_query"]}'
```

## Personal stylist assistant

The reusable system prompt for the stylist lives in
`lib/ai/personal-stylist.ts` and is loaded by Eve through
`agent/instructions.ts`. Eve's Telegram channel fetches permitted image
attachments for the model, so outfit photos, closet photos, and product
screenshots can be included in the agent turn.

Telegram voice notes are downloaded from Telegram, transcribed through AI
Gateway, and added to the same stylist turn as transcript context.
