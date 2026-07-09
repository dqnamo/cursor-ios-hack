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

### Optional: Web Search for Shopping

To enable web search for shopping recommendations, configure at least one of:

- `TAVILY_API_KEY` from [Tavily](https://tavily.com) (recommended)
- `SERPAPI_KEY` from [SerpAPI](https://serpapi.com)

When configured, the stylist can search the web for items (e.g., "summer clothes") and filter results based on the user's values, budget, and brand preferences.

Without a search API, the tool will provide curated search suggestions the user can use manually.

Eve requires Node.js 24 or newer.

## Eve Tools

The stylist agent has access to these tools:

- **get_style_profile** - Load the user's saved style profile and recent notes
- **update_style_profile** - Update vibe, budget, values, brands, sizing, lifestyle
- **remember_style_note** - Save short durable takeaways from photos and chat
- **search_shopping** - Search the web for items that match the user's values and budget

When a user asks for shopping recommendations (e.g., "I need summer clothes"), the `search_shopping` tool automatically:
- Incorporates their values (e.g., sustainable, ethical)
- Respects their budget
- Prefers their preferred brands
- Filters out avoided brands
- Returns curated results

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
