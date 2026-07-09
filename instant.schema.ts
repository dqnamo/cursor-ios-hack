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
    todos: i.entity({
      text: i.string(),
      done: i.boolean(),
      createdAt: i.number(),
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
      lastChatId: i.string().optional(),
      lastChatType: i.string().optional(),
      lastUpdateId: i.number().optional(),
    }),
  },
});

export default _schema;
