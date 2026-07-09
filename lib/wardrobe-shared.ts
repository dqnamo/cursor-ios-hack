export const WARDROBE_CATEGORIES = [
  "top",
  "bottom",
  "outerwear",
  "dress",
  "footwear",
  "accessory",
  "other",
] as const;

export type WardrobeCategory = (typeof WARDROBE_CATEGORIES)[number];

export type WardrobeItemInput = {
  category: WardrobeCategory;
  name: string;
  colors?: string[];
  description?: string;
};
