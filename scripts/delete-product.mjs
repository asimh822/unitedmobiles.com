// Deletes one product by id, including its variant rows and any images it
// hosts in Supabase Storage (the admin panel's delete leaves those orphaned).
// Prints what it found and requires --yes to actually delete.
// Usage: node scripts/delete-product.mjs <product-id> [--yes]
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

const id = process.argv[2];
const yes = process.argv.includes("--yes");
if (!id) { console.error("usage: node scripts/delete-product.mjs <product-id> [--yes]"); process.exit(1); }

const { data: p, error } = await supabase
  .from("products")
  .select("id, brand, model, category, price, images, product_variants ( id, color, image )")
  .eq("id", id)
  .maybeSingle();
if (error) { console.error(error.message); process.exit(1); }
if (!p) { console.error(`no product with id ${id}`); process.exit(1); }

const variants = p.product_variants ?? [];
// Product images plus any variant-only images, mapped back to storage paths.
const urls = [...(p.images ?? []), ...variants.map((v) => v.image)].filter(Boolean);
// Any key inside the bucket, not just catalog/ — images also land under press/
// (apply-press-images.mjs) and at the bucket root (admin uploads). The old
// catalog/-only pattern silently orphaned those.
const paths = [...new Set(
  urls.map((u) => (u.match(/\/product-images\/([^?]+)/) ?? [])[1]).filter(Boolean).map(decodeURIComponent),
)];

console.log(`${p.brand} ${p.model} (${p.category}, Rs. ${Number(p.price).toLocaleString()})`);
console.log(`  ${variants.length} variant rows, ${paths.length} storage images`);
if (!yes) { console.log("\ndry run — re-run with --yes to delete"); process.exit(0); }

if (paths.length) {
  const { error: se } = await supabase.storage.from("product-images").remove(paths);
  console.log(`storage: ${se ? `FAIL ${se.message}` : `${paths.length} images removed`}`);
}
const { error: ve } = await supabase.from("product_variants").delete().eq("product_id", p.id);
if (ve) { console.error(`variants FAIL: ${ve.message}`); process.exit(1); }
const { error: pe } = await supabase.from("products").delete().eq("id", p.id);
if (pe) { console.error(`product FAIL: ${pe.message}`); process.exit(1); }
console.log(`deleted ${p.brand} ${p.model} (${p.id})`);
