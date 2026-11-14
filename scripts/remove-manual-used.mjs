// One-off (14 Nov 2026): remove the hand-made Used listings. Used phones now
// come from the shop EPOS (E:\ShopSoftware\website_sync.py, source='epos'),
// one product per real handset, so the old per-model hand-made rows are stale.
//
// Writes a full backup (rows + variants) to backups/ first. A storage image is
// deleted only if no remaining product or variant still points at it.
// Never touches source='epos' rows. Dry run unless --yes.
// Usage: node scripts/remove-manual-used.mjs [--yes]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const yes = process.argv.includes("--yes");
const pathOf = (u) => {
  const m = (u ?? "").match(/\/product-images\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

const { data: used, error } = await supabase.from("products").select("*, product_variants(*)").eq("category", "Used");
if (error) throw new Error(error.message);
const targets = used.filter((p) => (p.source ?? "manual") !== "epos");
const targetIds = new Set(targets.map((p) => p.id));

// Every image still referenced by a product that stays.
const keep = new Set();
for (let from = 0; ; from += 1000) {
  const { data, error: e } = await supabase
    .from("products")
    .select("id, images, product_variants(image)")
    .range(from, from + 999);
  if (e) throw new Error(e.message);
  for (const p of data) {
    if (targetIds.has(p.id)) continue;
    for (const u of [...(p.images ?? []), ...(p.product_variants ?? []).map((v) => v.image)]) {
      const k = pathOf(u);
      if (k) keep.add(k);
    }
  }
  if (data.length < 1000) break;
}

const toRemove = new Set();
for (const p of targets) {
  for (const u of [...(p.images ?? []), ...(p.product_variants ?? []).map((v) => v.image)]) {
    const k = pathOf(u);
    if (k && !keep.has(k)) toRemove.add(k);
  }
  console.log(`  ${p.brand} ${p.model}  Rs. ${Number(p.price).toLocaleString()}`);
}
console.log(`\n${targets.length} hand-made Used products, ${toRemove.size} images only they use`);
if (!yes) {
  console.log("dry run: re-run with --yes to delete");
  process.exit(0);
}

const backup = join(root, "backups", "removed-manual-used-2026-11-14.json");
writeFileSync(backup, JSON.stringify(targets, null, 1));
console.log(`backup: ${backup}`);

if (toRemove.size) {
  const { error: se } = await supabase.storage.from("product-images").remove([...toRemove]);
  console.log(`storage: ${se ? `FAIL ${se.message}` : `${toRemove.size} images removed`}`);
}
const ids = [...targetIds];
const { error: ve } = await supabase.from("product_variants").delete().in("product_id", ids);
if (ve) throw new Error(`variants: ${ve.message}`);
const { error: pe } = await supabase.from("products").delete().in("id", ids);
if (pe) throw new Error(`products: ${pe.message}`);
console.log(`deleted ${ids.length} products`);
