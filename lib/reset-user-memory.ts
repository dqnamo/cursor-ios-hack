import { getInstantAdminDb } from "@/lib/instant-admin";

export type ResetOptions = {
  /**
   * Reset the style profile (vibe, budget, values, brands, notes, etc.)
   * @default true
   */
  resetProfile?: boolean;
  /**
   * Delete all style reference notes
   * @default true
   */
  resetStyleRefs?: boolean;
  /**
   * Delete all wardrobe items
   * @default false
   */
  resetWardrobe?: boolean;
  /**
   * Delete the telegramUsers record (resets first seen, last seen, etc.)
   * NOTE: This only deletes YOUR APP's tracking data, NOT the user's Telegram account
   * Usually not needed - keeps user registration data
   * @default false
   */
  resetTelegramUser?: boolean;
};

/**
 * Reset a user's conversation memory and style data.
 * This clears their style profile, notes, and optionally their wardrobe.
 *
 * IMPORTANT: This only deletes data from YOUR InstantDB database, NOT from Telegram itself.
 * The user's Telegram account and all Telegram data remain unchanged.
 * The `resetTelegramUser` option only deletes your app's tracking data (last seen, last message, etc.)
 *
 * @param telegramId - The Telegram user ID to reset
 * @param options - Options to control what gets reset
 * @returns Summary of what was deleted
 *
 * @example
 * // Reset everything except wardrobe
 * await resetUserMemory("123456789");
 *
 * @example
 * // Reset profile and wardrobe
 * await resetUserMemory("123456789", { resetWardrobe: true });
 *
 * @example
 * // Only reset style notes, keep profile
 * await resetUserMemory("123456789", {
 *   resetProfile: false,
 *   resetStyleRefs: true,
 * });
 */
export async function resetUserMemory(
  telegramId: string,
  options: ResetOptions = {},
) {
  const {
    resetProfile = true,
    resetStyleRefs = true,
    resetWardrobe = false,
    resetTelegramUser = false,
  } = options;

  const database = getInstantAdminDb();
  const result = {
    telegramId,
    deletedProfile: false,
    deletedStyleRefsCount: 0,
    deletedWardrobeItemsCount: 0,
    deletedTelegramUser: false,
  };

  // Query existing data
  const data = await database.query({
    styleProfiles: { $: { where: { telegramId } } },
    styleRefs: { $: { where: { telegramId } } },
    wardrobeItems: { $: { where: { telegramId } } },
    telegramUsers: { $: { where: { telegramId } } },
  });

  const transactions = [];

  // Reset style profile
  if (resetProfile && data.styleProfiles.length > 0) {
    for (const profile of data.styleProfiles) {
      transactions.push(database.tx.styleProfiles[profile.id].delete());
      result.deletedProfile = true;
    }
  }

  // Delete style references
  if (resetStyleRefs && data.styleRefs.length > 0) {
    for (const ref of data.styleRefs) {
      transactions.push(database.tx.styleRefs[ref.id].delete());
      result.deletedStyleRefsCount++;
    }
  }

  // Delete wardrobe items
  if (resetWardrobe && data.wardrobeItems.length > 0) {
    for (const item of data.wardrobeItems) {
      transactions.push(database.tx.wardrobeItems[item.id].delete());
      result.deletedWardrobeItemsCount++;
    }
  }

  // Delete telegram user record
  if (resetTelegramUser && data.telegramUsers.length > 0) {
    for (const user of data.telegramUsers) {
      transactions.push(database.tx.telegramUsers[user.id].delete());
      result.deletedTelegramUser = true;
    }
  }

  // Execute all deletions in a single transaction
  if (transactions.length > 0) {
    await database.transact(transactions);
  }

  return result;
}

/**
 * Check if a user has any saved memory
 * @param telegramId - The Telegram user ID to check
 */
export async function hasUserMemory(telegramId: string) {
  const database = getInstantAdminDb();
  const data = await database.query({
    styleProfiles: { $: { where: { telegramId } } },
    styleRefs: { $: { where: { telegramId } } },
    wardrobeItems: { $: { where: { telegramId } } },
  });

  return {
    hasProfile: data.styleProfiles.length > 0,
    styleRefsCount: data.styleRefs.length,
    wardrobeItemsCount: data.wardrobeItems.length,
    hasAnyMemory:
      data.styleProfiles.length > 0 ||
      data.styleRefs.length > 0 ||
      data.wardrobeItems.length > 0,
  };
}
