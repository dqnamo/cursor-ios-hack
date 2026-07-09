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
  // Telegram's file-download CDN often serves photos with a generic
  // `content-type` (e.g. `application/octet-stream`). Eve re-derives the media
  // type from that header when fetching the file for the model, so the
  // `image/*` upload policy would reject a real photo. This fetch wrapper
  // repairs the header for file downloads so images are accepted and reach the
  // model as proper image parts.
  api: { fetch: telegramApiFetch },
  botUsername: process.env.TELEGRAM_BOT_USERNAME,
  async onMessage(ctx, message) {
    const inbound = await defaultTelegramOnMessage(ctx, message);

    if (!inbound) {
      return null;
    }

    const voice = getTelegramVoice(message);

    if (voice) {
      let transcript: string | null = null;

      try {
        transcript = await transcribeTelegramVoice(ctx, voice);
      } catch (error) {
        console.error("Telegram voice transcription failed", error);
      }

      // Telegram voice notes carry no text or caption. Left untouched, Eve would
      // dispatch an empty user turn that AI Gateway rejects, so promote the
      // transcript (or a fallback) into the message body.
      applyVoiceTranscriptToMessage(message, transcript);
    }

    if (!message.from) {
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
      messageKind: voice
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

function applyVoiceTranscriptToMessage(
  message: TelegramOnMessageMessage,
  transcript: string | null,
) {
  const spoken = transcript?.trim() ?? "";
  const existing = (message.text || message.caption).trim();
  const body =
    spoken.length > 0
      ? spoken
      : "(Voice note received, but no speech could be transcribed.)";
  const text = existing.length > 0 ? `${existing}\n\n${body}` : body;

  // `text` is readonly on the public type, but the inbound hook has no other
  // way to set the model-visible message body for a voice note. Mutating the
  // parsed message here is the supported extension point.
  (message as { text: string }).text = text;
}

const TELEGRAM_IMAGE_MEDIA_TYPES: Record<string, string> = {
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

async function telegramApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  const url = telegramRequestUrl(input);

  // Only Telegram file downloads (`/file/bot<token>/...`) need repair. Regular
  // Bot API JSON calls are returned untouched.
  if (!url.includes("/file/bot")) {
    return response;
  }

  const currentType = response.headers.get("content-type");
  const corrected = correctTelegramImageMediaType(url, currentType);

  if (corrected === null || corrected === currentType) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("content-type", corrected);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function telegramRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

function correctTelegramImageMediaType(
  url: string,
  currentType: string | null,
) {
  if (currentType?.toLowerCase().startsWith("image/")) {
    return null;
  }

  let pathname: string;

  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url;
  }

  const lastDot = pathname.lastIndexOf(".");

  if (lastDot === -1) {
    return null;
  }

  const extension = pathname.slice(lastDot + 1).toLowerCase();

  return TELEGRAM_IMAGE_MEDIA_TYPES[extension] ?? null;
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
