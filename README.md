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
- `BUBBI_API_KEY` from [bubbi.app](https://www.bubbi.app/en/api-documentation)
  for the clothes-extractor API used to build the wardrobe
- `ADMIN_API_KEY` (optional) for the reset-user API endpoint - required for security if using the HTTP API to reset user memory

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

- **Product images** - Displays product photos from search results
  - Single image: Photo with caption and inline buttons
  - Multiple images: Photo gallery (up to 10 images) + description with buttons
- **Markdown formatting** - Messages use bold, emphasis, and clean layout
- **Inline keyboard buttons** - Shopping links automatically become tappable buttons
- **Smart button labels** - Extracts context-aware labels from surrounding text
- **Auto-detection** - Recognizes shopping results and formats accordingly

Example: When the agent finds 3 dresses with images, users see a photo gallery followed by a formatted message with 3 inline buttons they can tap to visit each store directly.

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

Virtual wardrobe lives in InstantDB too:

- `wardrobeItems` stores each cataloged garment (category, name, colors,
  description) keyed by Telegram user id, linked to its owner and to an
  extracted garment image in `$files`.
- When the user sends an outfit photo, the `catalog_wardrobe` Eve tool
  (`agent/tools/catalog_wardrobe.ts`) itemizes it with the vision model and
  gets a clean transparent-background cutout of the garments from the Bubbi
  clothes-extractor API (`lib/bubbi.ts`), then saves the items.
- The wardrobe is viewable on the web at `/wardrobe/<telegramId>`.

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

Telegram voice notes are downloaded from Telegram and transcribed through AI
Gateway (`openai/gpt-4o-mini-transcribe`). Because a voice note has no text or
caption, the transcript is promoted to the turn's message body — otherwise Eve
would dispatch an empty user turn that AI Gateway rejects.

Telegram serves photo downloads with a generic `content-type`, so the channel
normalizes the download `content-type` (via a custom `api.fetch`) to the correct
image MIME type. This keeps the `image/*` upload policy satisfied and passes the
photo to the model as a proper image part.

## Resetting User Memory

To reset a user so no memory of the conversation persists, you have three options:

### Option 1: API Endpoint (Requires Authentication)

**⚠️ Security Note:** The API endpoint requires an `ADMIN_API_KEY` environment variable for authentication. Without it, the API is disabled for security.

Set `ADMIN_API_KEY` in your `.env.local`:
```bash
ADMIN_API_KEY=your-secret-key-here
```

Check if a user has memory:
```bash
curl "http://localhost:3000/api/reset-user?telegramId=123456789" \
  -H "Authorization: Bearer your-secret-key-here"
```

Reset user memory (default: resets profile and style refs, keeps wardrobe):
```bash
curl -X POST http://localhost:3000/api/reset-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-key-here" \
  -d '{"telegramId": "123456789"}'
```

Reset everything including wardrobe:
```bash
curl -X POST http://localhost:3000/api/reset-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-key-here" \
  -d '{
    "telegramId": "123456789",
    "resetProfile": true,
    "resetStyleRefs": true,
    "resetWardrobe": true
  }'
```

### Option 2: CLI Script

Check if user has memory:
```bash
npx tsx scripts/reset-user.ts 123456789 --check
```

Reset profile and refs (default):
```bash
npx tsx scripts/reset-user.ts 123456789
```

Reset everything including wardrobe:
```bash
npx tsx scripts/reset-user.ts 123456789 --all
```

Only reset style refs, keep profile:
```bash
npx tsx scripts/reset-user.ts 123456789 --no-profile
```

### Option 3: Programmatic

```typescript
import { resetUserMemory, hasUserMemory } from "@/lib/reset-user-memory";

// Check if user has memory
const memoryCheck = await hasUserMemory("123456789");

// Reset everything except wardrobe (default)
const result = await resetUserMemory("123456789");

// Reset with custom options
const result = await resetUserMemory("123456789", {
  resetProfile: true,      // Reset style profile (default: true)
  resetStyleRefs: true,    // Delete style reference notes (default: true)
  resetWardrobe: false,    // Delete wardrobe items (default: false)
  resetTelegramUser: false // Delete telegram user record (default: false)
});
```

**What gets reset:**

**Important:** This only deletes data from **your InstantDB database**, NOT from Telegram itself. The user's Telegram account and Telegram data remain unchanged.

- **Style Profile** (`resetProfile`): Vibe, budget, values, brand preferences, sizing notes, lifestyle, intro step, and all saved notes
- **Style Refs** (`resetStyleRefs`): All style reference notes from photos and conversations
- **Wardrobe** (`resetWardrobe`): All cataloged clothing items with images
- **Telegram User** (`resetTelegramUser`): Your app's tracking data (first/last seen, last message, etc.) - NOT the user's Telegram account. Usually not needed.

After resetting, the user will start fresh as if they're a new user on their next interaction.
