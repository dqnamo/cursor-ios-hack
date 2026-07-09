import { id } from "@instantdb/admin";
import { generateObject } from "ai";
import { z } from "zod";
import { getInstantAdminDb } from "@/lib/instant-admin";
import {
  WARDROBE_CATEGORIES,
  type WardrobeItemInput,
} from "@/lib/wardrobe-shared";

export {
  WARDROBE_CATEGORIES,
  type WardrobeCategory,
  type WardrobeItemInput,
} from "@/lib/wardrobe-shared";

const wardrobeItemSchema = z.object({
  category: z
    .enum(WARDROBE_CATEGORIES)
    .describe("Best-fit garment category for this item."),
  name: z
    .string()
    .min(1)
    .describe(
      "Short human name for the item, e.g. 'white oxford shirt', 'black leather boots'.",
    ),
  colors: z
    .array(z.string())
    .default([])
    .describe("Dominant colors of the item, most prominent first."),
  description: z
    .string()
    .optional()
    .describe(
      "One short phrase on material, pattern, fit, or notable details.",
    ),
});

const VISION_MODEL = "anthropic/claude-sonnet-4.5";

const ITEMIZE_PROMPT = `You are cataloging a person's wardrobe from a photo of an outfit or garments.
List every distinct clothing item, pair of shoes, or accessory you can clearly see.
Rules:
- One entry per distinct item. Do not merge a top and bottom into one entry.
- Skip the person, background, and anything that is not wearable.
- Skip items you cannot identify with reasonable confidence.
- Keep names short and concrete.
If no clothing is visible, return an empty list.`;

/**
 * Uses the vision model to break an outfit photo into individual wardrobe
 * items with a category, name, colors, and a short description.
 */
export async function catalogOutfitItems(
  bytes: Uint8Array,
  mediaType: string,
): Promise<WardrobeItemInput[]> {
  const { object } = await generateObject({
    model: VISION_MODEL,
    output: "array",
    schema: wardrobeItemSchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: ITEMIZE_PROMPT },
          { type: "image", image: bytes, mediaType },
        ],
      },
    ],
  });

  return object.map((item) => ({
    category: item.category,
    name: item.name.trim(),
    colors: item.colors?.map((color) => color.trim()).filter(Boolean),
    description: item.description?.trim() || undefined,
  }));
}

/**
 * Uploads an extracted garment cutout to InstantDB storage and returns the
 * stored file id so it can be linked to wardrobe items.
 */
export async function uploadWardrobeImage(
  telegramId: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const database = getInstantAdminDb();
  const extension = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";
  const path = `wardrobe/${telegramId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;

  const result = await database.storage.uploadFile(path, Buffer.from(bytes), {
    contentType,
  });

  return result.data.id;
}

export type SaveWardrobeItemsInput = {
  telegramId: string;
  items: WardrobeItemInput[];
  imageFileId?: string;
  sourcePhotoFileId?: string;
};

/**
 * Persists the cataloged items to InstantDB, linking each one to the owning
 * Telegram user and (when available) the shared extracted garment image.
 */
export async function saveWardrobeItems({
  telegramId,
  items,
  imageFileId,
  sourcePhotoFileId,
}: SaveWardrobeItemsInput): Promise<number> {
  if (items.length === 0) {
    return 0;
  }

  const database = getInstantAdminDb();
  const now = Date.now();

  const telegramUser = await database.query({
    telegramUsers: { $: { where: { telegramId } } },
  });
  const telegramUserId = telegramUser.telegramUsers[0]?.id;

  const transactions = items.flatMap((item) => {
    const itemId = id();
    const colors = item.colors?.length ? item.colors.join(", ") : undefined;

    const chunks = [
      database.tx.wardrobeItems[itemId].update({
        telegramId,
        category: item.category,
        name: item.name,
        colors,
        description: item.description,
        sourcePhotoFileId,
        createdAt: now,
      }),
    ];

    if (imageFileId) {
      chunks.push(
        database.tx.wardrobeItems[itemId].link({ image: imageFileId }),
      );
    }

    if (telegramUserId) {
      chunks.push(
        database.tx.wardrobeItems[itemId].link({
          telegramUser: telegramUserId,
        }),
      );
    }

    return chunks;
  });

  await database.transact(transactions);

  return items.length;
}
