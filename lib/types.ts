export type Condition = "New" | "Used";
export type StockStatus = "in_stock" | "out_of_stock";

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
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  ram?: string;
  storage?: string;
  condition?: Condition;
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
