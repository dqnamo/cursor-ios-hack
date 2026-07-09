import type { Metadata } from "next";
import { Wardrobe } from "@/components/Wardrobe";

export const metadata: Metadata = {
  title: "Your Wardrobe · Dqnamo Stylist",
  description: "Your virtual wardrobe, built from the outfits you shared.",
};

export default async function WardrobePage({
  params,
}: {
  params: Promise<{ telegramId: string }>;
}) {
  const { telegramId } = await params;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-4 py-10 md:px-8 md:py-16">
      <Wardrobe telegramId={telegramId} />
    </main>
  );
}
