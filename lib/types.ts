import type { Category } from "@/lib/categories";

export type Condition = "New" | "Used";
export type StockStatus = "in_stock" | "out_of_stock";

export interface Brand {
  id: string;
  name: string;
  logo: string | null;
  displayOrder: number;
}

export interface SpecItem {
  label: string;
  value: string;
}

/** Specs are grouped by category and rendered as icon boxes, never paragraphs. */
export interface SpecGroup {
  category: string; // e.g. Display, Camera, Memory, Battery, Connectivity
  items: SpecItem[];
}

export interface Variant {
  id: string;
  color: string;
  colorHex: string | null;
  storage: string | null;
  ram: string | null;
  /** null = inherit product price */
  price: number | null;
  salePrice: number | null;
  /** null = use product's first image */
  image: string | null;
  inStock: boolean;
}

export interface Product {
  id: string;
  brand: string;
  model: string;
  category: Category;
  subcategory: string | null;
  subSubcategory: string | null;
  price: number;
  salePrice: number | null;
  saleActive: boolean;
  ram: string | null;
  storage: string | null;
  condition: Condition;
  ptaApproved: boolean;
  warranty: string | null;
  stockStatus: StockStatus;
  images: string[];
  specs: SpecGroup[];
  variants: Variant[];
  createdAt: string;
}

export type SortKey = "price_asc" | "price_desc" | "newest";

export interface CatalogQuery {
  q?: string;
  category?: Category;
  subcategory?: string;
  subSubcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  ram?: string;
  storage?: string;
  condition?: Condition;
  stock?: StockStatus;
  sort?: SortKey;
  page?: number;
  perPage?: number;
}

export interface CatalogResult {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface FilterOptions {
  brands: string[];
  rams: string[];
  storages: string[];
}

/** Price the customer actually pays right now. */
export function effectivePrice(p: Product, v?: Variant | null): number {
  if (v) {
    const base = v.price ?? p.price;
    const sale = v.salePrice ?? p.salePrice;
    return p.saleActive && sale != null ? sale : base;
  }
  return p.saleActive && p.salePrice != null ? p.salePrice : p.price;
}

export function isOnSale(p: Product): boolean {
  return p.saleActive && p.salePrice != null && p.salePrice < p.price;
}

/**
 * Card pricing across all grids: lowest effective price over every variant,
 * plus whether variants actually differ in price ("Starting from Rs. X").
 */
export function startingPrice(p: Product): { price: number; multiple: boolean } {
  if (p.variants.length === 0) {
    return { price: effectivePrice(p), multiple: false };
  }
  const prices = p.variants.map((v) => effectivePrice(p, v));
  return { price: Math.min(...prices), multiple: new Set(prices).size > 1 };
}

/** Distinct RAM+ROM combos available on a product, e.g. "8GB + 256GB". */
export interface RamRomCombo {
  ram: string | null;
  storage: string | null;
  label: string;
}

export function ramRomCombos(p: Product): RamRomCombo[] {
  const seen = new Map<string, RamRomCombo>();
  for (const v of p.variants) {
    if (!v.ram && !v.storage) continue;
    const key = `${v.ram ?? ""}|${v.storage ?? ""}`;
    if (!seen.has(key)) {
      seen.set(key, {
        ram: v.ram,
        storage: v.storage,
        label: [v.ram, v.storage].filter(Boolean).join(" + "),
      });
    }
  }
  return [...seen.values()];
}
