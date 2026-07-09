"use client";

import { CoatHangerIcon } from "@phosphor-icons/react/dist/ssr";
import { db, hasInstantConfig } from "@/lib/db";
import {
  WARDROBE_CATEGORIES,
  type WardrobeCategory,
} from "@/lib/wardrobe-shared";

const CATEGORY_LABELS: Record<WardrobeCategory, string> = {
  top: "Tops",
  bottom: "Bottoms",
  outerwear: "Outerwear",
  dress: "Dresses",
  footwear: "Footwear",
  accessory: "Accessories",
  other: "Other",
};

type WardrobeItem = {
  id: string;
  category: string;
  name: string;
  colors?: string;
  description?: string;
  createdAt?: number | Date;
  image?: { url?: string } | Array<{ url?: string }>;
};

export function Wardrobe({ telegramId }: { telegramId: string }) {
  if (!hasInstantConfig || !db) {
    return (
      <WardrobeShell>
        <EmptyState message="InstantDB isn't configured yet. Add NEXT_PUBLIC_INSTANT_APP_ID to enable the wardrobe." />
      </WardrobeShell>
    );
  }

  return <ConnectedWardrobe telegramId={telegramId} database={db} />;
}

function ConnectedWardrobe({
  telegramId,
  database,
}: {
  telegramId: string;
  database: NonNullable<typeof db>;
}) {
  const { data, isLoading, error } = database.useQuery({
    wardrobeItems: {
      $: {
        where: { telegramId },
        order: { createdAt: "desc" },
      },
      image: {},
    },
  });

  const items = (data?.wardrobeItems ?? []) as WardrobeItem[];

  return (
    <WardrobeShell count={items.length}>
      {isLoading ? (
        <EmptyState message="Loading your wardrobe…" />
      ) : error ? (
        <EmptyState message={error.message} />
      ) : items.length === 0 ? (
        <EmptyState message="No items yet. Send a few outfit photos in the chat and they'll show up here." />
      ) : (
        <div className="flex flex-col gap-10">
          {WARDROBE_CATEGORIES.map((category) => {
            const group = items.filter((item) => item.category === category);

            if (group.length === 0) {
              return null;
            }

            return (
              <section key={category} className="flex flex-col gap-3">
                <h2 className="font-medium text-grayscale-11 text-sm uppercase tracking-wide">
                  {CATEGORY_LABELS[category]}{" "}
                  <span className="text-grayscale-9">({group.length})</span>
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {group.map((item) => (
                    <WardrobeCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </WardrobeShell>
  );
}

function WardrobeCard({ item }: { item: WardrobeItem }) {
  const imageUrl = getImageUrl(item.image);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-grayscale-3 bg-grayscale-2">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-grayscale-1">
        {imageUrl ? (
          // biome-ignore lint/performance/noImgElement: garment cutouts are served from a dynamic InstantDB storage host, so next/image domain config can't be pinned
          <img
            src={imageUrl}
            alt={item.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <CoatHangerIcon
            size={32}
            weight="thin"
            className="text-grayscale-8"
          />
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <p className="truncate font-medium text-grayscale-12 text-sm capitalize">
          {item.name}
        </p>
        {item.colors ? (
          <p className="truncate text-grayscale-10 text-xs capitalize">
            {item.colors}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function WardrobeShell({
  count,
  children,
}: {
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex aspect-square w-9 items-center justify-center rounded-lg border border-grayscale-3 bg-grayscale-1 dark:border-grayscale-4 dark:bg-grayscale-3">
          <CoatHangerIcon size={20} weight="fill" className="text-accent-9" />
        </div>
        <h1 className="font-mono font-bold text-2xl text-grayscale-12 uppercase">
          Your Wardrobe
        </h1>
        <p className="text-grayscale-10 text-sm">
          {typeof count === "number"
            ? `${count} item${count === 1 ? "" : "s"} cataloged from your outfits.`
            : "Built from the outfit photos you shared."}
        </p>
      </header>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-grayscale-3 border-dashed bg-grayscale-1 px-4 py-16 text-center text-grayscale-10 text-sm">
      {message}
    </div>
  );
}

function getImageUrl(image: WardrobeItem["image"]): string | undefined {
  if (!image) {
    return undefined;
  }

  if (Array.isArray(image)) {
    return image[0]?.url;
  }

  return image.url;
}
