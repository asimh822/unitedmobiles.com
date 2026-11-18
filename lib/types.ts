import type { Category } from "@/lib/categories";
import { formatGb } from "@/lib/format";

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
  /** Shop-set price the PriceOye sync must leave alone. */
  priceLocked: boolean;
  images: string[];
  specs: SpecGroup[];
  variants: Variant[];
  /** Admin-picked "Goes with this device" product ids (in display order).
   * Empty/absent = automatic accessory suggestions. */
  suggestedIds?: string[];
  createdAt: string;
  /** 'epos' = a used phone pushed by the shop EPOS (one row per handset). */
  source?: string;
  /** Used phones from the EPOS: condition out of 10, e.g. 8.5. */
  conditionScore?: number | null;
  /** Used phones from the EPOS: warranty end date (YYYY-MM-DD). */
  warrantyUntil?: string | null;
  color?: string | null;
}

/** Whole months of warranty left, rounded up (12 days still reads "1 month"). */
export function warrantyMonthsLeft(until: string | null | undefined, now = new Date()): number {
  if (!until) return 0;
  const end = new Date(`${until}T23:59:59+05:00`);
  if (Number.isNaN(end.getTime()) || end <= now) return 0;
  let months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  if (end.getDate() > now.getDate()) months += 1;
  return Math.max(months, 1);
}

/** Warranty line for badges. An EPOS warranty end date counts down live;
 * an expired one shows nothing rather than a stale "4 months left". */
export function warrantyLabel(p: Product): string | null {
  if (p.warrantyUntil) {
    const m = warrantyMonthsLeft(p.warrantyUntil);
    return m ? `${m} month${m === 1 ? "" : "s"} warranty left` : null;
  }
  if (p.source === "epos") return null;
  return p.warranty;
}

/** "8.5/10" */
export function formatConditionScore(score: number | null | undefined): string | null {
  return score == null ? null : `${Number(score)}/10`;
}

/** Image for a list card or checkout thumbnail.
 *
 * Images are served exactly as stored (next.config.ts: unoptimized), so a
 * card showing a used phone's full ~190 KB photo costs that much per card per
 * visit. The EPOS sync (E:\ShopSoftware\website_sync.py _push_one) uploads a
 * ~26 KB 480px copy of photo 1 beside it, named by convention:
 *   .../used/<id>/1-<hash>.webp  ->  .../used/<id>/t1-<hash>.webp
 * Change one side and you must change the other. Every other product keeps
 * its first image. */
export function cardImage(p: Product): string | undefined {
  const first = p.images[0];
  if (!first || p.source !== "epos") return first;
  return first.replace(/\/1-([0-9a-f]+)\.webp$/, "/t1-$1.webp");
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

/** Price the customer actually pays right now. A "sale" price only counts
 * when it's genuinely below the base price (mirrors isOnSale), so corrupt
 * sale data can never raise the displayed price. */
export function effectivePrice(p: Product, v?: Variant | null): number {
  if (v) {
    const base = v.price ?? p.price;
    const sale = v.salePrice ?? p.salePrice;
    return p.saleActive && sale != null && sale < base ? sale : base;
  }
  return p.saleActive && p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;
}

export function isOnSale(p: Product): boolean {
  return p.saleActive && p.salePrice != null && p.salePrice < p.price;
}

/**
 * Card pricing across all grids: lowest effective price over the in-stock
 * variants (all of them if none is in stock), plus whether they actually
 * differ in price ("Starting from Rs. X"). An out-of-stock cheap variant must
 * not advertise a price nobody can buy at.
 */
export function startingPrice(p: Product): { price: number; multiple: boolean } {
  if (p.variants.length === 0) {
    return { price: effectivePrice(p), multiple: false };
  }
  const pool = p.variants.some((v) => v.inStock) ? p.variants.filter((v) => v.inStock) : p.variants;
  const prices = pool.map((v) => effectivePrice(p, v));
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
        label: [v.ram, v.storage].filter((x): x is string => Boolean(x)).map(formatGb).join(" + "),
      });
    }
  }
  return [...seen.values()];
}
