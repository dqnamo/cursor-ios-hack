import { telegramChannel } from "eve/channels/telegram";
import { upsertTelegramUser } from "../../lib/telegram-users";

type TelegramChannelConfig = NonNullable<Parameters<typeof telegramChannel>[0]>;
type TelegramOnMessage = NonNullable<TelegramChannelConfig["onMessage"]>;
type TelegramOnMessageContext = Parameters<TelegramOnMessage>[0];
type TelegramOnMessageMessage = Parameters<TelegramOnMessage>[1];

export default telegramChannel({
  botUsername: process.env.TELEGRAM_BOT_USERNAME,
  async onMessage(ctx, message) {
    const inbound = await defaultTelegramOnMessage(ctx, message);

    if (!inbound || !message.from) {
      return inbound;
    }

    const largestPhoto = message.attachments
      .filter((attachment) => attachment.kind === "photo")
      .toSorted((a, b) => {
        const aArea = (a.width ?? 0) * (a.height ?? 0);
        const bArea = (b.width ?? 0) * (b.height ?? 0);

        return bArea - aArea;
      })[0];

    await upsertTelegramUser({
      telegramId: message.from.id,
      username: message.from.username,
      firstName: message.from.firstName,
      lastName: message.from.lastName,
      languageCode: message.from.languageCode,
      isBot: message.from.isBot,
      messageId: message.messageId,
      messageText: message.text || message.caption || undefined,
      messageKind: largestPhoto ? "photo" : message.text ? "text" : "other",
      photoFileId: largestPhoto?.fileId,
      chatId: message.chat.id,
      chatType: message.chat.type,
    });

    return inbound;
  },
  uploadPolicy: {
    allowedMediaTypes: ["image/*"],
    maxBytes: 10 * 1024 * 1024,
  },
});

async function defaultTelegramOnMessage(
  ctx: TelegramOnMessageContext,
  message: TelegramOnMessageMessage,
) {
  if (!shouldDispatchTelegramMessage(message, ctx.telegram.botUsername)) {
    return null;
  }

  await ctx.telegram.startTyping();

  return {
    auth: getTelegramAuth(message),
  };
}

function shouldDispatchTelegramMessage(
  message: TelegramOnMessageMessage,
  botUsername: string | undefined,
) {
  if (message.from?.isBot === true || message.chat.type === "channel") {
    return false;
  }

  const text = message.text || message.caption;
  const hasContent = text.trim().length > 0 || message.attachments.length > 0;

  if (!hasContent) {
    return false;
  }

  return (
    message.chat.type === "private" ||
    message.replyToMessage?.from?.isBot === true ||
    isBotCommand(text, botUsername) ||
    (botUsername !== undefined && mentionsBot(text, botUsername))
  );
}

function getTelegramAuth(message: TelegramOnMessageMessage) {
  const sender = message.from;

  if (!sender) {
    return null;
  }

  const isGroup =
    message.chat.type === "group" || message.chat.type === "supergroup";

  return {
    attributes: {
      chat_id: message.chat.id,
      chat_type: message.chat.type,
      message_id: message.messageId,
      user_id: sender.id,
      ...(message.chat.title ? { chat_title: message.chat.title } : {}),
      ...(message.messageThreadId !== undefined
        ? { message_thread_id: String(message.messageThreadId) }
        : {}),
      ...(sender.username ? { username: sender.username } : {}),
    },
    authenticator: "telegram-webhook",
    issuer: isGroup ? `telegram:${message.chat.id}` : "telegram",
    principalId: isGroup
      ? `telegram:${message.chat.id}:${sender.id}`
      : `telegram:${sender.id}`,
    principalType: sender.isBot ? "service" : "user",
  };
}

function isBotCommand(text: string, botUsername: string | undefined) {
  const match = /^\/([A-Za-z0-9_]+)(?:@([A-Za-z0-9_]+))?(?:\s|$)/u.exec(text);

  if (!match) {
    return false;
  }

  const target = match[2];

  return (
    target === undefined || target.toLowerCase() === botUsername?.toLowerCase()
  );
}

function mentionsBot(text: string, botUsername: string) {
  return text.toLowerCase().includes(`@${botUsername.toLowerCase()}`);
}
