import { defineTool } from "eve/tools";
import { z } from "zod";
import { extractClothes } from "../../lib/bubbi";
import { getInstantAdminDb } from "../../lib/instant-admin";
import { resolveTelegramIdFromAuth } from "../../lib/style-profiles";
import { downloadTelegramFile } from "../../lib/telegram-media";
import {
  catalogOutfitItems,
  saveWardrobeItems,
  uploadWardrobeImage,
} from "../../lib/wardrobe";

export default defineTool({
  description:
    "Extract the individual clothing items from the outfit or garment photo the user most recently sent, and save them to their virtual wardrobe. Call this whenever the user shares a photo of clothes they own or an outfit they wear (during onboarding when they send outfit pics, or any time later). It detects each item, gets a clean cutout of the garments, and stores them so they show up on the user's wardrobe page. Do not call it for selfies with no visible outfit or for pure inspiration/screenshot images the user does not own.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const telegramId = resolveTelegramIdFromAuth(ctx.session.auth.current);

    if (!telegramId) {
      return {
        ok: false as const,
        error: "No Telegram user id on this session.",
      };
    }

    const database = getInstantAdminDb();
    const userResult = await database.query({
      telegramUsers: { $: { where: { telegramId } } },
    });
    const lastPhotoFileId = userResult.telegramUsers[0]?.lastPhotoFileId;
    const fileId =
      typeof lastPhotoFileId === "string" ? lastPhotoFileId : undefined;

    if (!fileId) {
      return {
        ok: false as const,
        error: "No recent photo found to catalog. Ask the user to send one.",
      };
    }

    let download: Awaited<ReturnType<typeof downloadTelegramFile>>;
    try {
      download = await downloadTelegramFile(fileId);
    } catch (error) {
      return {
        ok: false as const,
        error:
          error instanceof Error
            ? error.message
            : "Could not download the photo from Telegram.",
      };
    }

    const filename = `outfit.${
      download.mediaType.includes("png")
        ? "png"
        : download.mediaType.includes("webp")
          ? "webp"
          : "jpg"
    }`;

    const [items, extraction] = await Promise.all([
      catalogOutfitItems(download.bytes, download.mediaType),
      extractClothes(download.bytes, filename, download.mediaType).catch(
        (error) => {
          console.error("Bubbi clothes extraction failed", error);
          return null;
        },
      ),
    ]);

    if (items.length === 0) {
      return {
        ok: true as const,
        saved: 0,
        message: "No clothing items were detected in that photo.",
      };
    }

    let imageFileId: string | undefined;
    if (extraction?.imageUrl) {
      try {
        const cutout = await fetch(extraction.imageUrl);
        if (cutout.ok) {
          const cutoutBytes = new Uint8Array(await cutout.arrayBuffer());
          imageFileId = await uploadWardrobeImage(
            telegramId,
            cutoutBytes,
            "image/png",
          );
        }
      } catch (error) {
        console.error("Failed to store extracted garment cutout", error);
      }
    }

    const saved = await saveWardrobeItems({
      telegramId,
      items,
      imageFileId,
      sourcePhotoFileId: fileId,
    });

    return {
      ok: true as const,
      saved,
      hasImage: Boolean(imageFileId),
      items: items.map((item) => ({
        category: item.category,
        name: item.name,
        colors: item.colors ?? [],
      })),
    };
  },
});
