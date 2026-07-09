import { transcribe } from "ai";
import {
  type TelegramInboundResult,
  telegramChannel,
} from "eve/channels/telegram";
import { upsertTelegramUser } from "../../lib/telegram-users";

type TelegramChannelConfig = NonNullable<Parameters<typeof telegramChannel>[0]>;
type TelegramOnMessage = NonNullable<TelegramChannelConfig["onMessage"]>;
type TelegramOnMessageContext = Parameters<TelegramOnMessage>[0];
type TelegramOnMessageMessage = Parameters<TelegramOnMessage>[1];

export default telegramChannel({
  botUsername: process.env.TELEGRAM_BOT_USERNAME,
  async onMessage(ctx, message) {
    const inbound = await defaultTelegramOnMessage(ctx, message);
    const voice = getTelegramVoice(message);
    const voiceTranscript = voice
      ? await transcribeTelegramVoice(ctx, voice)
      : null;

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
      messageText:
        voiceTranscript ?? (message.text || message.caption || undefined),
      messageKind: voiceTranscript
        ? "voice"
        : largestPhoto
          ? "photo"
          : message.text
            ? "text"
            : "other",
      photoFileId: largestPhoto?.fileId,
      chatId: message.chat.id,
      chatType: message.chat.type,
    });

    return voiceTranscript
      ? {
          ...inbound,
          context: [
            ...(inbound.context ?? []),
            `<voice_note_transcript>${voiceTranscript}</voice_note_transcript>`,
          ],
        }
      : inbound;
  },
  uploadPolicy: {
    allowedMediaTypes: ["image/*"],
    maxBytes: 10 * 1024 * 1024,
  },
  events: {
    async "message.completed"(eventData, channel) {
      const text = eventData.message;

      // Handle null messages or empty text
      if (!text || text.trim().length === 0) {
        return;
      }

      // Extract image URLs from IMAGE: prefix lines
      const imagePattern = /^IMAGE:\s*(https?:\/\/[^\s]+)/gim;
      const imageMatches = [...text.matchAll(imagePattern)];
      const imageUrls = imageMatches.map((match) => match[1]);

      // Remove IMAGE: lines from the text
      const textWithoutImages = text.replace(imagePattern, "").trim();

      // Extract shopping links (excluding image URLs)
      const urlPattern = /https?:\/\/[^\s]+/g;
      const urls = textWithoutImages.match(urlPattern) || [];

      // Create inline keyboard for shopping links
      const inlineKeyboard =
        urls.length > 0 && urls.length <= 6
          ? {
              inline_keyboard: urls.map((url: string, index: number) => {
                const urlIndex = textWithoutImages.indexOf(url);
                const contextBefore = textWithoutImages
                  .slice(Math.max(0, urlIndex - 100), urlIndex)
                  .trim();
                const lastLine = contextBefore.split("\n").pop() || "";
                const buttonText = lastLine.trim() || `Option ${index + 1}`;

                return [
                  {
                    text: buttonText.slice(0, 50),
                    url: url,
                  },
                ];
              }),
            }
          : undefined;

      const baseParams = {
        chat_id: channel.state.chatId,
        ...(channel.state.messageThreadId !== undefined
          ? { message_thread_id: channel.state.messageThreadId }
          : {}),
      };

      // Send with images if available
      if (imageUrls.length === 1) {
        // Single image: use sendPhoto with caption
        await channel.telegram.request("sendPhoto", {
          ...baseParams,
          photo: imageUrls[0],
          caption: textWithoutImages,
          parse_mode: "Markdown",
          ...(inlineKeyboard ? { reply_markup: inlineKeyboard } : {}),
        });
      } else if (imageUrls.length > 1) {
        // Multiple images: send as media group, then text with buttons
        const mediaGroup = imageUrls.slice(0, 10).map((url, index) => ({
          type: "photo" as const,
          media: url,
          ...(index === 0 ? { caption: "Shopping options" } : {}),
        }));

        await channel.telegram.request("sendMediaGroup", {
          ...baseParams,
          media: mediaGroup,
        });

        // Send text with buttons separately
        await channel.telegram.request("sendMessage", {
          ...baseParams,
          text: textWithoutImages,
          parse_mode: "Markdown",
          ...(inlineKeyboard ? { reply_markup: inlineKeyboard } : {}),
        });
      } else {
        // No images: send text with markdown and buttons
        await channel.telegram.request("sendMessage", {
          ...baseParams,
          text: textWithoutImages,
          parse_mode: "Markdown",
          ...(inlineKeyboard ? { reply_markup: inlineKeyboard } : {}),
        });
      }
    },
  },
});

async function defaultTelegramOnMessage(
  ctx: TelegramOnMessageContext,
  message: TelegramOnMessageMessage,
): Promise<TelegramInboundResult> {
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
  const hasContent =
    text.trim().length > 0 ||
    message.attachments.length > 0 ||
    getTelegramVoice(message) !== null;

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

type TelegramVoice = {
  file_id: string;
  duration?: number;
  mime_type?: string;
  file_size?: number;
};

function getTelegramVoice(message: TelegramOnMessageMessage) {
  const voice = message.raw.voice;

  if (!isTelegramVoice(voice)) {
    return null;
  }

  return voice;
}

function isTelegramVoice(value: unknown): value is TelegramVoice {
  return (
    typeof value === "object" &&
    value !== null &&
    "file_id" in value &&
    typeof value.file_id === "string"
  );
}

async function transcribeTelegramVoice(
  ctx: TelegramOnMessageContext,
  voice: TelegramVoice,
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is required to transcribe voice notes.",
    );
  }

  const file = await ctx.telegram.request("getFile", {
    file_id: voice.file_id,
  });
  const filePath = getTelegramFilePath(file.body);

  if (!filePath) {
    throw new Error("Telegram did not return a file path for the voice note.");
  }

  const response = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${filePath}`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to download Telegram voice note: ${response.status}`,
    );
  }

  const audio = new Uint8Array(await response.arrayBuffer());
  const transcript = await transcribe({
    model: "openai/gpt-4o-mini-transcribe",
    audio,
    providerOptions: {
      openai: {
        language: "en",
      },
    },
  });

  return transcript.text.trim();
}

function getTelegramFilePath(body: unknown) {
  if (
    typeof body === "object" &&
    body !== null &&
    "result" in body &&
    typeof body.result === "object" &&
    body.result !== null &&
    "file_path" in body.result &&
    typeof body.result.file_path === "string"
  ) {
    return body.result.file_path;
  }

  return null;
}
