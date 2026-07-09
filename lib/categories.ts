export const CATEGORIES = ["New Phones", "Used", "KeyPad Phones", "Tabs", "Accessories"] as const;
export type Category = (typeof CATEGORIES)[number];

export const ACCESSORY_SUBCATEGORIES = ["Chargers", "Watches", "Gadgets", "Sound"] as const;
export type AccessorySubcategory = (typeof ACCESSORY_SUBCATEGORIES)[number];

export const SOUND_SUBCATEGORIES = ["Handsfree", "Headphones", "Bluetooth"] as const;
export type SoundSubcategory = (typeof SOUND_SUBCATEGORIES)[number];

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const CATEGORY_SLUGS: Record<string, Category> = {
  "new-phones": "New Phones",
  used: "Used",
  "keypad-phones": "KeyPad Phones",
  tabs: "Tabs",
  accessories: "Accessories",
};

export function categorySlug(category: Category): string {
  return Object.entries(CATEGORY_SLUGS).find(([, c]) => c === category)![0];
}

export function categoryPath(category: Category, sub?: string, subSub?: string): string {
  if (category !== "Accessories") return `/${categorySlug(category)}`;
  let path = "/accessories";
  if (sub) path += `/${slugify(sub)}`;
  if (subSub) path += `/${slugify(subSub)}`;
  return path;
}

/** Does this category use phone-style specs (RAM/Storage/PTA)? */
export function isPhoneLike(category: Category): boolean {
  return category !== "Accessories";
}
