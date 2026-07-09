import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    telegramUsers: i.entity({
      telegramId: i.string().unique().indexed(),
      username: i.string().optional(),
      firstName: i.string().optional(),
      lastName: i.string().optional(),
      languageCode: i.string().optional(),
      isBot: i.boolean(),
      firstSeenAt: i.number(),
      lastSeenAt: i.number(),
      lastMessageAt: i.number(),
      lastMessageId: i.number().optional(),
      lastMessageText: i.string().optional(),
      lastMessageKind: i.string().optional(),
      lastPhotoFileId: i.string().optional(),
      lastChatId: i.string().optional(),
      lastChatType: i.string().optional(),
      lastUpdateId: i.number().optional(),
    }),
    styleProfiles: i.entity({
      telegramId: i.string().unique().indexed(),
      vibe: i.string().optional(),
      budget: i.string().optional(),
      values: i.string().optional(),
      preferredBrands: i.string().optional(),
      avoidedBrands: i.string().optional(),
      sizingNotes: i.string().optional(),
      lifestyle: i.string().optional(),
      notes: i.string().optional(),
      introStep: i.string().indexed(),
      onboardingComplete: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    styleRefs: i.entity({
      telegramId: i.string().indexed(),
      summary: i.string(),
      source: i.string().optional(),
      createdAt: i.number().indexed(),
    }),
  },
  links: {
    telegramUserStyleProfile: {
      forward: {
        on: "telegramUsers",
        has: "one",
        label: "styleProfile",
      },
      reverse: {
        on: "styleProfiles",
        has: "one",
        label: "telegramUser",
      },
    },
    telegramUserStyleRefs: {
      forward: {
        on: "telegramUsers",
        has: "many",
        label: "styleRefs",
      },
      reverse: {
        on: "styleRefs",
        has: "one",
        label: "telegramUser",
      },
    },
  },
});

export default _schema;
