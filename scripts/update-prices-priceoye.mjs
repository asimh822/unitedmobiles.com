// Updates prices of EXISTING catalog products from a PriceOye crawl
// (po-*.json from scripts/crawl-priceoye.mjs). Matches on brand + normalized
// model within New Phones / KeyPad Phones / Tabs (condition New), then sets
// product.price to the cheapest in-stock crawl price (+ --markup) and refreshes
// matching variant-row prices (by RAM+storage combo, or by color for
// color-only variants). Never touches sale prices, stock, images, or specs, and
// never inserts anything — new models are scripts/import-priceoye.mjs's job.
// Usage: node scripts/update-prices-priceoye.mjs <crawl-dir> [--dry] [--markup=1000] [--phones-only]
//   --markup=N      add N rupees on top of every PriceOye price
//   --phones-only   only touch New Phones + KeyPad Phones (skip Tabs)
// Products flagged price_locked are skipped entirely — those prices are set by
// hand in the admin panel and must not be pulled back to the market rate.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bucketsFor, crawlIdentity, fetchAll, parseSize, sameModel, serviceClient, titleCase, norm } from "./priceoye-match.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node scripts/update-prices-priceoye.mjs <crawl-dir> [--dry] [--markup=N] [--phones-only]"); process.exit(1); }
const dry = process.argv.includes("--dry");
const markup = parseInt((process.argv.find((a) => a.startsWith("--markup=")) ?? "--markup=0").slice(9), 10) || 0;
const categories = process.argv.includes("--phones-only") ? ["New Phones", "KeyPad Phones"] : ["New Phones", "KeyPad Phones", "Tabs"];
const supabase = serviceClient();

/* ------------------------------ load crawl ------------------------------ */

const items = [];
for (const f of readdirSync(dir).filter((f) => f.startsWith("po-") && f.endsWith(".json"))) {
  items.push(...JSON.parse(readFileSync(join(dir, f), "utf8")));
}

// brand|category -> [{norm, combos, colors, colorCombos, minPrice, title}]
// every price already includes the markup
const crawlIndex = new Map();
for (const item of items) {
  if (item.section !== "phone" && item.section !== "tablet") continue;
  const inStock = (item.variants ?? []).filter((v) => v.inStock && Number.isFinite(v.price) && v.price >= 200);
  if (!item.title || inStock.length === 0) continue;
  const id = crawlIdentity(item);

  const combos = new Map(); // "ram|storage" -> min price across colors
  const colors = new Map(); // color label (lower) -> min price across sizes
  const colorCombos = new Map(); // "color|ram|storage" -> exact price
  for (const v of inStock) {
    const price = v.price + markup;
    const { ram, storage, extra } = parseSize(v.size);
    const colorLabel = [titleCase(v.color || ""), extra].filter(Boolean).join(" ").trim().toLowerCase();
    if (ram || storage) {
      const key = `${ram ?? ""}|${storage ?? ""}`;
      combos.set(key, Math.min(combos.get(key) ?? Infinity, price));
      if (colorLabel) colorCombos.set(`${colorLabel}|${key}`, price);
    }
    if (colorLabel) colors.set(colorLabel, Math.min(colors.get(colorLabel) ?? Infinity, price));
  }

  const list = crawlIndex.get(id.bucket) ?? [];
  list.push({
    norm: id.norm,
    combos,
    colors,
    colorCombos,
    minPrice: Math.min(...inStock.map((v) => v.price)) + markup,
    title: item.title,
  });
  crawlIndex.set(id.bucket, list);
}
console.log(`crawl: ${items.length} items indexed under ${crawlIndex.size} brand/category buckets; markup Rs. ${markup.toLocaleString()}`);

/* ------------------------------ match + update ------------------------------ */

const products = await fetchAll(() =>
  supabase
    .from("products")
    .select("id, brand, model, category, price, sale_price, sale_active, price_locked, product_variants ( id, color, ram, storage, price )")
    .in("category", categories)
    .eq("condition", "New")
    .order("id"),
);
console.log(`catalog: ${products.length} New-condition products loaded (${categories.join(", ")})`);

const changes = [];
const unmatched = [];
const locked = [];
const saleWarnings = [];
let productUpdates = 0, variantUpdates = 0, unchangedCount = 0;

for (const p of products) {
  if (p.price_locked) { locked.push(`${p.brand} ${p.model} (Rs. ${Number(p.price).toLocaleString()})`); continue; }
  // numeric columns can arrive as strings from PostgREST
  p.price = Number(p.price);
  for (const v of p.product_variants ?? []) v.price = v.price == null ? null : Number(v.price);
  const n = norm(p.model, p.brand);
  const candidates = bucketsFor(p.brand, p.category).flatMap((b) => crawlIndex.get(b) ?? []);
  const hit = candidates.find((c) => sameModel(c.norm, n));
  if (!hit) { unmatched.push(`${p.brand} ${p.model} (${p.category})`); continue; }

  let touched = false;

  if (p.price !== hit.minPrice) {
    const swing = Math.abs(hit.minPrice - p.price) / p.price;
    changes.push(
      `${p.brand} ${p.model}: Rs. ${p.price.toLocaleString()} -> Rs. ${hit.minPrice.toLocaleString()}` +
        (swing > 0.3 ? `  [BIG SWING ${(swing * 100).toFixed(0)}% — matched "${hit.title}"]` : ""),
    );
    if (p.sale_active && p.sale_price != null && Number(p.sale_price) >= hit.minPrice) {
      saleWarnings.push(`${p.brand} ${p.model}: sale price Rs. ${Number(p.sale_price).toLocaleString()} is not below new price Rs. ${hit.minPrice.toLocaleString()}`);
    }
    if (!dry) {
      const { error } = await supabase.from("products").update({ price: hit.minPrice }).eq("id", p.id);
      if (error) { console.error(`FAIL ${p.brand} ${p.model}: ${error.message}`); continue; }
    }
    productUpdates++;
    touched = true;
  }

  for (const v of p.product_variants ?? []) {
    let crawlPrice;
    if (v.ram || v.storage) {
      const combo = `${v.ram ?? ""}|${v.storage ?? ""}`;
      // exact color+combo price first; combo minimum only as fallback
      crawlPrice =
        (v.color && hit.colorCombos.get(`${v.color.trim().toLowerCase()}|${combo}`)) ??
        hit.combos.get(combo);
    } else if (v.color) {
      crawlPrice = hit.colors.get(v.color.trim().toLowerCase());
    }
    if (!Number.isFinite(crawlPrice)) continue; // combo not carried by PriceOye — leave as-is
    // null price means "inherit product price"; keep null when it still matches.
    if (v.price == null && crawlPrice === hit.minPrice) continue;
    if (v.price === crawlPrice) continue;
    changes.push(
      `  variant ${p.brand} ${p.model} [${[v.color, v.ram, v.storage].filter(Boolean).join(" / ")}]: ` +
        `${v.price == null ? "(inherit)" : `Rs. ${v.price.toLocaleString()}`} -> Rs. ${crawlPrice.toLocaleString()}`,
    );
    if (!dry) {
      const { error } = await supabase.from("product_variants").update({ price: crawlPrice }).eq("id", v.id);
      if (error) { console.error(`variant FAIL ${p.brand} ${p.model}: ${error.message}`); continue; }
    }
    variantUpdates++;
    touched = true;
  }

  if (!touched) unchangedCount++;
}

console.log(`\n${dry ? "[DRY] " : ""}price updates: ${productUpdates} products, ${variantUpdates} variant rows; unchanged: ${unchangedCount}; unmatched: ${unmatched.length}; price-locked (skipped): ${locked.length}`);
if (saleWarnings.length) console.log(`sale-price warnings: ${saleWarnings.length} (see price-update-log.txt)`);
writeFileSync(
  join(dir, "price-update-log.txt"),
  [...changes, ...(saleWarnings.length ? ["", "# active sale prices that are no longer below the new price:", ...saleWarnings] : [])].join("\n"),
);
writeFileSync(join(dir, "price-update-unmatched.txt"), unmatched.join("\n"));
if (locked.length) writeFileSync(join(dir, "price-update-locked.txt"), locked.join("\n"));
console.log("change log -> price-update-log.txt, unmatched -> price-update-unmatched.txt");
