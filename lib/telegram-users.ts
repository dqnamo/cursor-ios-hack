import { getInstantAdminDb } from "@/lib/instant-admin";

export type TelegramUserUpsertInput = {
  telegramId: string;
  isBot: boolean;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  messageAt?: number;
  messageId?: string | number;
  messageText?: string;
  messageKind?: "photo" | "text" | "other";
  photoFileId?: string;
  chatId?: string;
  chatType?: string;
  updateId?: string | number;
};

export async function upsertTelegramUser(input: TelegramUserUpsertInput) {
  const database = getInstantAdminDb();
  const now = Date.now();
  const existing = await database.query({
    telegramUsers: { $: { where: { telegramId: input.telegramId } } },
  });
  const existingUser = existing.telegramUsers[0];

  await database.transact(
    database.tx.telegramUsers.lookup("telegramId", input.telegramId).update({
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      languageCode: input.languageCode,
      isBot: input.isBot,
      firstSeenAt: existingUser?.firstSeenAt ?? now,
      lastSeenAt: now,
      lastMessageAt: input.messageAt ?? now,
      lastMessageId: normalizeOptionalNumber(input.messageId),
      lastMessageText: input.messageText,
      lastMessageKind: input.messageKind,
      lastPhotoFileId: input.photoFileId,
      lastChatId: input.chatId,
      lastChatType: input.chatType,
      lastUpdateId: normalizeOptionalNumber(input.updateId),
    }),
  );

  return {
    created: !existingUser,
    telegramId: input.telegramId,
  };
}

function normalizeOptionalNumber(value?: string | number) {
  if (value === undefined) {
    return undefined;
  }

  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}
