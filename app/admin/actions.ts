"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, checkPassword, isAdminAuthenticated, makeToken } from "@/lib/admin-auth";
import { parseModelConfig } from "@/lib/csv";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { SpecGroup } from "@/lib/types";

export interface ActionState {
  error?: string;
  success?: string;
}

const NOT_CONFIGURED =
  "Supabase is not configured yet — add your real project URL and keys to .env.local, run the migration, then try again.";

/* -------------------------------- auth -------------------------------- */

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    return { error: "Incorrect password." };
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

/* ---------------------------- product CRUD ---------------------------- */

/**
 * Case-insensitive brand resolution: returns the exact casing already in the
 * brands table, inserting the brand only when it's genuinely new.
 */
async function canonicalBrand(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  name: string,
): Promise<string> {
  const trimmed = name.trim();
  const { data } = await supabase
    .from("brands")
    .select("name")
    .ilike("name", trimmed)
    .maybeSingle();
  if (data?.name) return data.name;
  await supabase.from("brands").insert({ name: trimmed });
  return trimmed;
}

export interface ProductPayload {
  id?: string;
  brand: string;
  model: string;
  category: "New Phones" | "Used" | "KeyPad Phones" | "Tabs" | "Accessories";
  subcategory: string | null;
  subSubcategory: string | null;
  price: number;
  salePrice: number | null;
  saleActive: boolean;
  ram: string | null;
  storage: string | null;
  condition: "New" | "Used";
  ptaApproved: boolean;
  warranty: string | null;
  stockStatus: "in_stock" | "out_of_stock";
  existingImages: string[];
  specs: SpecGroup[];
  /** "Goes with this device" product ids, in display order. */
  suggestedIds: string[];
  variants: {
    color: string;
    colorHex: string | null;
    storage: string | null;
    ram: string | null;
    price: number | null;
    salePrice: number | null;
    image: string | null;
    inStock: boolean;
  }[];
}

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  let payload: ProductPayload;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "")) as ProductPayload;
  } catch {
    return { error: "Invalid form data." };
  }
  if (!payload.brand.trim() || !payload.model.trim() || !(payload.price > 0)) {
    return { error: "Brand, model and a price greater than zero are required." };
  }

  const supabase = getSupabaseAdmin();

  // Upload any newly added images to Supabase Storage.
  const images = [...payload.existingImages];
  const files = formData.getAll("newImages").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      contentType: file.type || undefined,
    });
    if (error) return { error: `Image upload failed: ${error.message}` };
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    images.push(data.publicUrl);
  }

  // Reuse the existing brand's exact casing so "Samsung" and "SAMSUNG" never
  // become two separate brands; only genuinely new brands get inserted.
  const brandName = await canonicalBrand(supabase, payload.brand);

  const row = {
    brand: brandName,
    model: payload.model.trim(),
    category: payload.category,
    subcategory: payload.category === "Accessories" ? payload.subcategory : null,
    sub_subcategory:
      payload.category === "Accessories" && payload.subcategory === "Sound"
        ? payload.subSubcategory
        : null,
    price: payload.price,
    sale_price: payload.salePrice,
    sale_active: payload.saleActive,
    ram: payload.ram || null,
    storage: payload.storage || null,
    condition: payload.condition,
    pta_approved: payload.ptaApproved,
    warranty: payload.warranty || null,
    stock_status: payload.stockStatus,
    images,
    specs: payload.specs,
    suggested_ids: payload.suggestedIds ?? [],
  };

  let productId = payload.id;
  if (productId) {
    const { error } = await supabase.from("products").update(row).eq("id", productId);
    if (error) return { error: `Failed to update product: ${error.message}` };
    const { error: delErr } = await supabase.from("product_variants").delete().eq("product_id", productId);
    if (delErr) return { error: `Failed to update variants: ${delErr.message}` };
  } else {
    const { data, error } = await supabase.from("products").insert(row).select("id").single();
    if (error) return { error: `Failed to create product: ${error.message}` };
    productId = data.id as string;
  }

  if (payload.variants.length > 0) {
    const { error } = await supabase.from("product_variants").insert(
      payload.variants.map((v, i) => ({
        product_id: productId,
        color: v.color,
        color_hex: v.colorHex,
        storage: v.storage,
        ram: v.ram,
        price: v.price,
        sale_price: v.salePrice,
        image: v.image,
        in_stock: v.inStock,
        sort_order: i,
      })),
    );
    if (error) return { error: `Failed to save variants: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath(`/products/${productId}`);
  redirect("/admin?saved=1");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  if (!isSupabaseConfigured()) redirect("/admin?error=not-configured");
  const id = String(formData.get("id") ?? "");
  if (id) {
    await getSupabaseAdmin().from("products").delete().eq("id", id);
    revalidatePath("/");
  }
  redirect("/admin");
}

/* ------------------------------ CSV import ------------------------------ */

/* ------------------------------ brands ------------------------------ */

export interface BrandInput {
  id?: string;
  name: string;
  logo: string | null;
  displayOrder: number;
}

export async function saveBrands(brands: BrandInput[]): Promise<ActionState> {
  await requireAdmin();
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  const supabase = getSupabaseAdmin();
  for (const b of brands) {
    if (!b.name.trim()) continue;
    const row = { name: b.name.trim(), logo: b.logo?.trim() || null, display_order: b.displayOrder };
    const { error } = b.id
      ? await supabase.from("brands").update(row).eq("id", b.id)
      : await supabase.from("brands").upsert(row, { onConflict: "name" });
    if (error) return { error: `Failed to save brand ${b.name}: ${error.message}` };
  }
  revalidatePath("/");
  return { success: "Brands saved. Homepage order updates within 5 minutes." };
}

export async function deleteBrand(formData: FormData): Promise<void> {
  await requireAdmin();
  if (!isSupabaseConfigured()) redirect("/admin/brands");
  const id = String(formData.get("id") ?? "");
  if (id) {
    await getSupabaseAdmin().from("brands").delete().eq("id", id);
    revalidatePath("/");
  }
  redirect("/admin/brands");
}

export interface ImportRow {
  brand: string;
  model: string;
  category: string | null;
  price: number;
  sale_price: number | null;
  sale_active: boolean;
  ram: string | null;
  storage: string | null;
  color: string | null;
  condition: "New" | "Used";
  pta_approved: boolean;
  warranty: string | null;
  in_stock: boolean;
}

/**
 * Rows sharing brand + model + condition merge into one product; each distinct
 * color becomes a variant of it.
 */
export async function importProducts(rows: ImportRow[]): Promise<ActionState> {
  await requireAdmin();
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };
  if (!rows.length) return { error: "No valid rows to import." };

  // Auto-merge memory configs: "A07 4+128" rows become model "A07" with
  // RAM/storage filled, so all configs group into one product below.
  for (const row of rows) {
    const parsed = parseModelConfig(row.model);
    if (parsed) {
      row.model = parsed.base;
      row.ram = row.ram || parsed.ram;
      row.storage = row.storage || parsed.storage;
    }
  }

  const groups = new Map<string, ImportRow[]>();
  for (const row of rows) {
    const key = `${row.brand.toLowerCase()}|${row.model.toLowerCase()}|${row.condition}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const supabase = getSupabaseAdmin();
  let imported = 0;

  const VALID_CATEGORIES = ["New Phones", "Used", "KeyPad Phones", "Tabs", "Accessories"];
  const brandCache = new Map<string, string>();

  for (const group of groups.values()) {
    const first = group[0];
    // Category: explicit CSV value if valid, else Used condition -> Used, else New Phones.
    const category = VALID_CATEGORIES.includes(first.category ?? "")
      ? (first.category as string)
      : first.condition === "Used"
        ? "Used"
        : "New Phones";
    const brandName = brandCache.get(first.brand.toLowerCase()) ?? (await canonicalBrand(supabase, first.brand));
    brandCache.set(first.brand.toLowerCase(), brandName);
    const cheapest = group.reduce((a, b) => (b.price < a.price ? b : a));
    const { data, error } = await supabase
      .from("products")
      .insert({
        brand: brandName,
        model: first.model,
        category,
        price: cheapest.price,
        sale_price: cheapest.sale_price,
        sale_active: cheapest.sale_active,
        ram: cheapest.ram,
        storage: cheapest.storage,
        condition: first.condition,
        pta_approved: first.pta_approved,
        warranty: first.warranty,
        stock_status: group.some((r) => r.in_stock) ? "in_stock" : "out_of_stock",
        images: [],
        specs: [],
      })
      .select("id")
      .single();
    if (error) return { error: `Import failed at ${first.brand} ${first.model}: ${error.message}` };

    // Variant rows for every distinct color AND for differing memory configs
    // (memory-only variants use an empty color).
    const multiConfig = new Set(group.map((r) => `${r.ram}|${r.storage}`)).size > 1;
    const variantRows = group.filter((r) => r.color || multiConfig);
    if (variantRows.length > 0) {
      const { error: vErr } = await supabase.from("product_variants").insert(
        variantRows.map((r, i) => ({
          product_id: data.id,
          color: r.color ?? "",
          storage: r.storage,
          ram: r.ram,
          price: r.price,
          sale_price: r.sale_active ? r.sale_price : null,
          in_stock: r.in_stock,
          sort_order: i,
        })),
      );
      if (vErr) return { error: `Variant import failed for ${first.model}: ${vErr.message}` };
    }
    imported++;
  }

  revalidatePath("/");
  return { success: `Imported ${imported} product${imported === 1 ? "" : "s"} from ${rows.length} rows.` };
}
