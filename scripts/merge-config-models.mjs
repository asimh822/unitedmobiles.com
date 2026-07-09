// One-off: merges products whose model names embed memory configs
// ("A07 4+64" / "A07 4+128" / "A07 6+128") into one product with RAM+ROM
// variants, and cleans config suffixes off single products.
// Usage: node scripts/merge-config-models.mjs [--dry]
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const dry = process.argv.includes("--dry");

// Mirrors lib/csv.ts parseModelConfig (scripts can't import TS).
function parseModelConfig(model) {
  const trimmed = model.trim();
  const plus = trimmed.match(/^(.*\S)\s+(\d+)\s*\+\s*(\d+)?\s*[A-Za-z]*$/);
  if (plus) {
    const rom = plus[3] ? Number(plus[3]) : null;
    if (rom !== null && rom < 16) return null;
    return { base: plus[1].trim(), ram: `${Number(plus[2])}GB`, storage: rom ? `${rom}GB` : null };
  }
  const gb = trimmed.match(/^(.*\S)\s+(\d+)\s*GB$/i);
  if (gb) return { base: gb[1].trim(), ram: `${Number(gb[2])}GB`, storage: null };
  return null;
}

const { data: products, error } = await supabase
  .from("products")
  .select("*, product_variants(*)");
if (error) throw new Error(error.message);

// Group by brand + parsed base model + category.
const groups = new Map();
for (const p of products) {
  const parsed = parseModelConfig(p.model);
  if (!parsed) continue;
  const key = `${p.brand.toLowerCase()}|${parsed.base.toLowerCase()}|${p.category}`;
  const list = groups.get(key) ?? [];
  list.push({ product: p, parsed });
  groups.set(key, list);
}

let merged = 0;
let renamed = 0;

for (const members of groups.values()) {
  members.sort((a, b) => Number(a.product.price) - Number(b.product.price));
  const base = members[0];
  const baseName = base.parsed.base;

  if (members.length === 1) {
    // Single product: clean the model name, fill RAM/storage fields.
    const p = base.product;
    console.log(`RENAME  ${p.brand} "${p.model}" -> "${baseName}" (${base.parsed.ram}/${base.parsed.storage ?? "-"})`);
    if (!dry) {
      const { error: e } = await supabase
        .from("products")
        .update({ model: baseName, ram: p.ram || base.parsed.ram, storage: p.storage || base.parsed.storage })
        .eq("id", p.id);
      if (e) throw new Error(`${p.model}: ${e.message}`);
    }
    renamed++;
    continue;
  }

  console.log(`MERGE   ${base.product.brand} "${baseName}" <- ${members.map((m) => `"${m.product.model}"`).join(", ")}`);
  const baseSaleActive = members.some((m) => m.product.sale_active);
  const images = [...new Set(members.flatMap((m) => m.product.images ?? []))];

  if (!dry) {
    let sortOrder = 0;
    for (const m of members) {
      const p = m.product;
      const salePrice = p.sale_active ? p.sale_price : baseSaleActive ? p.price : null;
      if (p.product_variants.length > 0) {
        // Existing (color) variants move to the base with explicit config/price.
        for (const v of p.product_variants) {
          const { error: e } = await supabase
            .from("product_variants")
            .update({
              product_id: base.product.id,
              ram: v.ram ?? m.parsed.ram,
              storage: v.storage ?? m.parsed.storage,
              price: v.price ?? p.price,
              sale_price: v.sale_price ?? salePrice,
              sort_order: sortOrder++,
            })
            .eq("id", v.id);
          if (e) throw new Error(`variant move for ${p.model}: ${e.message}`);
        }
      } else {
        const { error: e } = await supabase.from("product_variants").insert({
          product_id: base.product.id,
          color: "",
          ram: m.parsed.ram,
          storage: m.parsed.storage,
          price: p.price,
          sale_price: salePrice,
          in_stock: p.stock_status === "in_stock",
          sort_order: sortOrder++,
        });
        if (e) throw new Error(`variant insert for ${p.model}: ${e.message}`);
      }
    }

    const { error: e1 } = await supabase
      .from("products")
      .update({
        model: baseName,
        ram: base.parsed.ram,
        storage: base.parsed.storage,
        sale_active: baseSaleActive,
        images,
        stock_status: members.some((m) => m.product.stock_status === "in_stock") ? "in_stock" : "out_of_stock",
      })
      .eq("id", base.product.id);
    if (e1) throw new Error(`base update ${baseName}: ${e1.message}`);

    const rest = members.slice(1).map((m) => m.product.id);
    const { error: e2 } = await supabase.from("products").delete().in("id", rest);
    if (e2) throw new Error(`delete merged ${baseName}: ${e2.message}`);
  }
  merged++;
}

console.log(`\n${dry ? "[DRY RUN] " : ""}Merged groups: ${merged}, single renames: ${renamed}`);
