// Inserts the sample catalog into a real Supabase project.
// Usage: node scripts/seed-supabase.mjs   (reads .env.local)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Minimal .env.local parser (no dotenv dependency).
for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || url.includes("placeholder") || !key || key.includes("placeholder")) {
  console.error("Set real NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const products = JSON.parse(readFileSync(join(root, "lib", "seed-data.json"), "utf8"));

for (const p of products) {
  const { data: inserted, error } = await supabase
    .from("products")
    .insert({
      brand: p.brand,
      model: p.model,
      price: p.price,
      sale_price: p.salePrice,
      sale_active: p.saleActive,
      ram: p.ram,
      storage: p.storage,
      condition: p.condition,
      pta_approved: p.ptaApproved,
      warranty: p.warranty,
      stock_status: p.stockStatus,
      images: p.images,
      specs: p.specs,
    })
    .select("id")
    .single();
  if (error) {
    console.error(`Failed to insert ${p.brand} ${p.model}: ${error.message}`);
    process.exit(1);
  }
  const variants = p.variants.map((v, i) => ({
    product_id: inserted.id,
    color: v.color,
    color_hex: v.colorHex,
    storage: v.storage,
    ram: v.ram,
    price: v.price,
    sale_price: v.salePrice,
    image: v.image,
    in_stock: v.inStock,
    sort_order: i,
  }));
  const { error: vErr } = await supabase.from("product_variants").insert(variants);
  if (vErr) {
    console.error(`Failed to insert variants for ${p.model}: ${vErr.message}`);
    process.exit(1);
  }
  console.log(`Seeded ${p.brand} ${p.model} (${variants.length} variants)`);
}
console.log("Done.");
