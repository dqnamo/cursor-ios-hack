# Base

A Next.js starter using Chord UI, InstantDB, and Trigger.dev.

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
- `TELEGRAM_WEBHOOK_SECRET` optional Telegram webhook `secret_token`
- `TRIGGER_PROJECT_REF` from Trigger.dev
- `TRIGGER_SECRET_KEY` from Trigger.dev
- `NEXT_PUBLIC_POSTHOG_TOKEN` from PostHog
- `NEXT_PUBLIC_POSTHOG_HOST` from PostHog, defaults to `https://us.i.posthog.com`

## Trigger.dev

Jobs live in `/jobs`, configured by `trigger.config.ts`.

```bash
npm run trigger:dev
npm run trigger:deploy
```

## InstantDB

The starter schema and permissions live in `instant.schema.ts` and
`instant.perms.ts`.

## Telegram webhook

Incoming Telegram bot messages can create or update InstantDB
`telegramUsers` records through `POST /api/webhooks/telegram`. The route uses
the sender's Telegram id as a unique key, so every later message updates the
same record. Photo messages are marked with `lastMessageKind: "photo"` and the
largest Telegram photo size's `file_id` is stored as `lastPhotoFileId`.

Set the webhook URL with Telegram and, if `TELEGRAM_WEBHOOK_SECRET` is set,
pass the same value as Telegram's `secret_token` so Telegram includes the
`X-Telegram-Bot-Api-Secret-Token` header on webhook requests.

## Personal stylist assistant

The reusable system prompt for the stylist lives in
`lib/ai/personal-stylist.ts`. Use `buildPersonalStylistSystemPrompt()` when
calling a vision-capable chat model so text-only messages and image messages get
consistent guidance.

For Telegram photos, fetch the image bytes or public file URL from Telegram with
the bot token and pass that image to the model alongside the user's caption/text.
The prompt tells the model to ground outfit, closet, and product advice in the
visible image details.

## PostHog

Client-side analytics are initialized in `instrumentation-client.ts`. Leave
`NEXT_PUBLIC_POSTHOG_TOKEN` empty to disable PostHog locally.
