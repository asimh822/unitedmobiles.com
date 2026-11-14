// Removes catalog products that PriceOye now lists as out of stock or
// discontinued (oos-*.json from scripts/crawl-priceoye.mjs). Matches on brand +
// normalized model within New Phones / KeyPad Phones / Tabs (condition New),
// exactly like the price updater. A product that ALSO matches an in-stock
// PriceOye listing (po-*.json) is never removed. Products PriceOye does not
// carry at all are left alone.
// Without --yes it only writes the candidate list. With --yes it first writes a
// full JSON backup (product rows + variants) to <crawl-dir> and backups/, then
// deletes the storage images, variant rows and product rows.
// Usage: node scripts/remove-priceoye-oos.mjs <crawl-dir> [--yes] [--phones-only]
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bucketsFor, crawlIdentity, fetchAll, norm, root, sameModel, serviceClient } from "./priceoye-match.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node scripts/remove-priceoye-oos.mjs <crawl-dir> [--yes] [--phones-only]"); process.exit(1); }
const yes = process.argv.includes("--yes");
const categories = process.argv.includes("--phones-only") ? ["New Phones", "KeyPad Phones"] : ["New Phones", "KeyPad Phones", "Tabs"];
const supabase = serviceClient();

/* ------------------------------ load crawl ------------------------------ */

function loadJson(prefix) {
  const out = [];
  for (const f of readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(".json"))) {
    out.push(...JSON.parse(readFileSync(join(dir, f), "utf8")));
  }
  return out.filter((i) => (i.section === "phone" || i.section === "tablet") && i.title);
}

function index(items) {
  const map = new Map(); // brand|category -> [{norm, title, reason, url}]
  for (const item of items) {
    const id = crawlIdentity(item);
    const list = map.get(id.bucket) ?? [];
    list.push({ norm: id.norm, title: item.title, reason: item.reason, url: item.url });
    map.set(id.bucket, list);
  }
  return map;
}

const oosIndex = index(loadJson("oos-"));
const liveIndex = index(loadJson("po-"));
console.log(`crawl: ${[...oosIndex.values()].flat().length} unavailable listings, ${[...liveIndex.values()].flat().length} in-stock listings`);

/* ------------------------------ match ------------------------------ */

const products = await fetchAll(() =>
  supabase
    .from("products")
    .select("*, product_variants ( * )")
    .in("category", categories)
    .eq("condition", "New")
    .order("id"),
);
console.log(`catalog: ${products.length} New-condition products loaded (${categories.join(", ")})`);

const candidates = [];
const keptLive = [];
for (const p of products) {
  const buckets = bucketsFor(p.brand, p.category);
  const n = norm(p.model, p.brand);
  const oos = buckets.flatMap((b) => oosIndex.get(b) ?? []).find((c) => sameModel(c.norm, n));
  if (!oos) continue;
  const live = buckets.flatMap((b) => liveIndex.get(b) ?? []).find((c) => sameModel(c.norm, n));
  if (live) { keptLive.push(`${p.brand} ${p.model}: OOS "${oos.title}" but in stock as "${live.title}"`); continue; }
  candidates.push({ p, oos, exact: oos.norm === n });
}

const lines = candidates.map(
  ({ p, oos, exact }) =>
    `${p.brand} ${p.model} (${p.category}, Rs. ${Number(p.price).toLocaleString()}, ${(p.product_variants ?? []).length} variants)` +
    `  <- ${oos.reason}: "${oos.title}"${exact ? "" : "  [FUZZY MATCH — review]"}`,
);
writeFileSync(join(dir, "oos-removal-candidates.txt"), [...lines, ...(keptLive.length ? ["", "# kept (also in stock on PriceOye):", ...keptLive] : [])].join("\n"));
console.log(`\n${candidates.length} products to remove (${candidates.filter((c) => !c.exact).length} fuzzy), ${keptLive.length} kept because another PriceOye listing is in stock`);
console.log("candidate list -> oos-removal-candidates.txt");
if (!yes) { console.log("\ndry run — re-run with --yes to delete"); process.exit(0); }

/* ------------------------------ backup + delete ------------------------------ */

const stamp = new Date().toISOString().slice(0, 10);
const backupName = `removed-priceoye-oos-${stamp}.json`;
const backup = candidates.map(({ p, oos }) => ({ reason: oos.reason, priceoye: oos.url, product: p }));
writeFileSync(join(dir, backupName), JSON.stringify(backup, null, 1));
mkdirSync(join(root, "backups"), { recursive: true });
copyFileSync(join(dir, backupName), join(root, "backups", backupName));
console.log(`backup -> ${join(root, "backups", backupName)}`);

let removed = 0;
for (const { p } of candidates) {
  const urls = [...(p.images ?? []), ...(p.product_variants ?? []).map((v) => v.image)].filter(Boolean);
  const paths = [...new Set(urls.map((u) => (u.match(/product-images\/(catalog\/[^?]+)/) ?? [])[1]).filter(Boolean))];
  if (paths.length) {
    const { error: se } = await supabase.storage.from("product-images").remove(paths);
    if (se) console.error(`  storage FAIL ${p.brand} ${p.model}: ${se.message}`);
  }
  const { error: ve } = await supabase.from("product_variants").delete().eq("product_id", p.id);
  if (ve) { console.error(`variants FAIL ${p.brand} ${p.model}: ${ve.message}`); continue; }
  const { error: pe } = await supabase.from("products").delete().eq("id", p.id);
  if (pe) { console.error(`product FAIL ${p.brand} ${p.model}: ${pe.message}`); continue; }
  removed++;
}
console.log(`\nremoved ${removed}/${candidates.length} products`);
