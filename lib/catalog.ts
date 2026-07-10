import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import seedJson from "@/lib/seed-data.json";
import type {
  Brand,
  CatalogQuery,
  CatalogResult,
  Condition,
  FilterOptions,
  Product,
  StockStatus,
  Variant,
} from "@/lib/types";
import { effectivePrice } from "@/lib/types";
import type { Category } from "@/lib/categories";

export const PER_PAGE = 12;

const seedProducts = seedJson as Product[];

/* ---------- row mapping (Supabase snake_case -> app camelCase) ---------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVariant(row: any): Variant {
  return {
    id: row.id,
    color: row.color,
    colorHex: row.color_hex ?? null,
    storage: row.storage ?? null,
    ram: row.ram ?? null,
    price: row.price != null ? Number(row.price) : null,
    salePrice: row.sale_price != null ? Number(row.sale_price) : null,
    image: row.image ?? null,
    inStock: row.in_stock ?? true,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapProduct(row: any): Product {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    category: (row.category ?? "New Phones") as Category,
    subcategory: row.subcategory ?? null,
    subSubcategory: row.sub_subcategory ?? row.subSubcategory ?? null,
    price: Number(row.price),
    salePrice: row.sale_price != null ? Number(row.sale_price) : null,
    saleActive: row.sale_active ?? false,
    ram: row.ram ?? null,
    storage: row.storage ?? null,
    condition: (row.condition ?? "New") as Condition,
    ptaApproved: row.pta_approved ?? true,
    warranty: row.warranty ?? null,
    stockStatus: (row.stock_status ?? "in_stock") as StockStatus,
    images: row.images ?? [],
    specs: row.specs ?? [],
    variants: (row.product_variants ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(mapVariant),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

/* ------------------------------ queries ------------------------------ */

export async function getProducts(query: CatalogQuery): Promise<CatalogResult> {
  const page = Math.max(1, query.page ?? 1);
  const perPage = query.perPage ?? PER_PAGE;

  if (!isSupabaseConfigured()) {
    return querySeed(query, page, perPage);
  }

  const supabase = getSupabase();
  let q = supabase
    .from("products")
    .select("*, product_variants(*)", { count: "exact" });

  if (query.q) {
    // Strip ILIKE wildcards and PostgREST .or() syntax characters.
    const term = query.q.trim().replace(/[%_,()]/g, " ").trim();
    if (term) q = q.or(`brand.ilike.%${term}%,model.ilike.%${term}%`);
  }
  if (query.category) q = q.eq("category", query.category);
  if (query.subcategory) q = q.eq("subcategory", query.subcategory);
  if (query.subSubcategory) q = q.eq("sub_subcategory", query.subSubcategory);
  if (query.brand) q = q.eq("brand", query.brand);
  if (query.ram) q = q.eq("ram", query.ram);
  if (query.storage) q = q.eq("storage", query.storage);
  if (query.condition) q = q.eq("condition", query.condition);
  if (query.stock) q = q.eq("stock_status", query.stock);
  if (query.minPrice != null) q = q.gte("effective_price", query.minPrice);
  if (query.maxPrice != null) q = q.lte("effective_price", query.maxPrice);

  switch (query.sort) {
    case "price_asc":
      q = q.order("effective_price", { ascending: true });
      break;
    case "price_desc":
      q = q.order("effective_price", { ascending: false });
      break;
    default:
      q = q.order("created_at", { ascending: false });
  }

  const from = (page - 1) * perPage;
  const { data, count, error } = await q.range(from, from + perPage - 1);
  if (error) throw new Error(`Failed to load products: ${error.message}`);

  const total = count ?? 0;
  return {
    products: (data ?? []).map(mapProduct),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    return seedProducts.find((p) => p.id === id) ?? null;
  }
  const { data, error } = await getSupabase()
    .from("products")
    .select("*, product_variants(*)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapProduct(data);
}

export async function getAllProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return seedProducts;
  const { data, error } = await getSupabase()
    .from("products")
    .select("*, product_variants(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return (data ?? []).map(mapProduct);
}

/** Same brand first, then closest in price. */
export async function getSimilarProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await getAllProducts();
  const price = effectivePrice(product);
  return all
    .filter((p) => p.id !== product.id)
    .sort((a, b) => {
      const aBrand = a.brand === product.brand ? 0 : 1;
      const bBrand = b.brand === product.brand ? 0 : 1;
      if (aBrand !== bBrand) return aBrand - bBrand;
      return Math.abs(effectivePrice(a) - price) - Math.abs(effectivePrice(b) - price);
    })
    .slice(0, limit);
}

/** Filter-bar options, scoped to the current category/brand context. */
export async function getFilterOptions(scope: {
  category?: Category;
  subcategory?: string;
  subSubcategory?: string;
  brand?: string;
} = {}): Promise<FilterOptions> {
  let products: Pick<Product, "brand" | "ram" | "storage" | "category" | "subcategory" | "subSubcategory">[];
  if (!isSupabaseConfigured()) {
    products = seedProducts;
  } else {
    let q = getSupabase().from("products").select("brand, ram, storage, category, subcategory, sub_subcategory");
    if (scope.category) q = q.eq("category", scope.category);
    if (scope.subcategory) q = q.eq("subcategory", scope.subcategory);
    if (scope.subSubcategory) q = q.eq("sub_subcategory", scope.subSubcategory);
    if (scope.brand) q = q.eq("brand", scope.brand);
    const { data } = await q;
    products = (data ?? []).map((r) => ({ ...r, subSubcategory: r.sub_subcategory }));
  }
  if (!isSupabaseConfigured()) {
    products = products.filter(
      (p) =>
        (!scope.category || p.category === scope.category) &&
        (!scope.subcategory || p.subcategory === scope.subcategory) &&
        (!scope.subSubcategory || p.subSubcategory === scope.subSubcategory) &&
        (!scope.brand || p.brand === scope.brand),
    );
  }
  const uniq = (values: (string | null)[]) =>
    [...new Set(values.filter((v): v is string => Boolean(v)))];
  const byGb = (a: string, b: string) => parseInt(a) - parseInt(b);
  return {
    brands: uniq(products.map((p) => p.brand)).sort(),
    rams: uniq(products.map((p) => p.ram)).sort(byGb),
    storages: uniq(products.map((p) => p.storage)).sort(byGb),
  };
}

/* ------------------------------ brands ------------------------------ */

export async function getBrands(): Promise<Brand[]> {
  if (!isSupabaseConfigured()) {
    // Seed mode: derive from seed products, alphabetical.
    return [...new Set(seedProducts.map((p) => p.brand))].sort().map((name, i) => ({
      id: name,
      name,
      logo: null,
      displayOrder: (i + 1) * 10,
    }));
  }
  const { data, error } = await getSupabase()
    .from("brands")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(`Failed to load brands: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    logo: r.logo ?? null,
    displayOrder: r.display_order ?? 999,
  }));
}

export interface BrandRow {
  brand: Brand;
  products: Product[];
}

/** Brand rows for a category, grouped by brand in display_order, capped per brand. */
export async function getBrandRows(category: Category, perBrand = 24): Promise<BrandRow[]> {
  const [brands, all] = await Promise.all([
    getBrands(),
    getProducts({ category, perPage: 500, sort: "newest" }),
  ]);
  // Group case-insensitively so a stray "Samsung" still lands in SAMSUNG's row.
  const byBrand = new Map<string, Product[]>();
  for (const p of all.products) {
    const key = p.brand.trim().toUpperCase();
    const list = byBrand.get(key) ?? [];
    if (list.length < perBrand) list.push(p);
    byBrand.set(key, list);
  }
  const rows: BrandRow[] = [];
  const consumed = new Set<string>();
  for (const brand of brands) {
    const key = brand.name.trim().toUpperCase();
    const products = byBrand.get(key);
    if (products?.length && !consumed.has(key)) {
      rows.push({ brand, products });
      consumed.add(key);
    }
  }
  // Brands present in products but missing from the brands table still show, last.
  for (const [key, products] of byBrand) {
    if (!consumed.has(key)) {
      const name = products[0].brand;
      rows.push({ brand: { id: name, name, logo: null, displayOrder: 999 }, products });
    }
  }
  return rows;
}

/* --------------------------- seed fallback --------------------------- */

function querySeed(query: CatalogQuery, page: number, perPage: number): CatalogResult {
  let list = [...seedProducts];

  if (query.q) {
    const term = query.q.trim().toLowerCase();
    list = list.filter((p) => `${p.brand} ${p.model}`.toLowerCase().includes(term));
  }
  if (query.category) list = list.filter((p) => p.category === query.category);
  if (query.subcategory) list = list.filter((p) => p.subcategory === query.subcategory);
  if (query.subSubcategory) list = list.filter((p) => p.subSubcategory === query.subSubcategory);
  if (query.brand) list = list.filter((p) => p.brand === query.brand);
  if (query.ram) list = list.filter((p) => p.ram === query.ram);
  if (query.storage) list = list.filter((p) => p.storage === query.storage);
  if (query.condition) list = list.filter((p) => p.condition === query.condition);
  if (query.stock) list = list.filter((p) => p.stockStatus === query.stock);
  if (query.minPrice != null) list = list.filter((p) => effectivePrice(p) >= query.minPrice!);
  if (query.maxPrice != null) list = list.filter((p) => effectivePrice(p) <= query.maxPrice!);

  switch (query.sort) {
    case "price_asc":
      list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
      break;
    case "price_desc":
      list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
      break;
    default:
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const total = list.length;
  const from = (page - 1) * perPage;
  return {
    products: list.slice(from, from + perPage),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}
