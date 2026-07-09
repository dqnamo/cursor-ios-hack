import { NextResponse } from "next/server";
import { getInstantAdminDb } from "@/lib/instant-admin";

export const runtime = "nodejs";

type TelegramSender = {
  id: number;
  is_bot: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TelegramChat = {
  id: number;
  type?: string;
};

type TelegramMessage = {
  message_id?: number;
  date?: number;
  from?: TelegramSender;
  chat?: TelegramChat;
};

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
};

const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (
    expectedSecret &&
    request.headers.get(TELEGRAM_SECRET_HEADER) !== expectedSecret
  ) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let update: TelegramUpdate;

  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid Telegram update payload" },
      { status: 400 },
    );
  }

  const message = getTelegramMessage(update);
  const sender = message?.from;

  if (!sender) {
    return NextResponse.json({ ok: true, skipped: "no_telegram_sender" });
  }

  try {
    const database = getInstantAdminDb();
    const now = Date.now();
    const telegramId = String(sender.id);
    const messageAt = message.date ? message.date * 1000 : now;
    const existing = await database.query({
      telegramUsers: { $: { where: { telegramId } } },
    });
    const existingUser = existing.telegramUsers[0];

    await database.transact(
      database.tx.telegramUsers.lookup("telegramId", telegramId).update({
        telegramId,
        username: sender.username,
        firstName: sender.first_name,
        lastName: sender.last_name,
        languageCode: sender.language_code,
        isBot: sender.is_bot,
        firstSeenAt: existingUser?.firstSeenAt ?? now,
        lastSeenAt: now,
        lastMessageAt: messageAt,
        lastMessageId: message.message_id,
        lastChatId: message.chat ? String(message.chat.id) : undefined,
        lastChatType: message.chat?.type,
        lastUpdateId: update.update_id,
      }),
    );

    return NextResponse.json({
      ok: true,
      created: !existingUser,
      telegramId,
    });
  } catch (error) {
    console.error("Failed to upsert Telegram user", error);

    return NextResponse.json(
      { ok: false, error: "Failed to save Telegram user" },
      { status: 500 },
    );
  }
}

function getTelegramMessage(update: TelegramUpdate) {
  return (
    update.message ??
    update.edited_message ??
    update.channel_post ??
    update.edited_channel_post
  );
}
