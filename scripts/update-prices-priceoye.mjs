// Updates prices of EXISTING catalog products from a PriceOye crawl
// (po-*.json from scripts/crawl-priceoye.mjs). Matches on brand + normalized
// model within New Phones / KeyPad Phones / Tabs (condition New), then sets
// product.price to the cheapest in-stock crawl price and refreshes matching
// variant-row prices (by RAM+storage combo, or by color for color-only
// variants). Never touches sale prices, stock, images, or specs, and never
// inserts anything — new models are scripts/import-priceoye.mjs's job.
// Usage: node scripts/update-prices-priceoye.mjs <crawl-dir> [--dry]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
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

const dir = process.argv[2];
if (!dir) { console.error("usage: node scripts/update-prices-priceoye.mjs <crawl-dir> [--dry]"); process.exit(1); }
const dry = process.argv.includes("--dry");

/* ---------- shared with import-priceoye.mjs (model/brand matching) ---------- */

const BRAND_ALIASES = {
  xiaomi: "MI",
  mi: "MI",
  qmobile: "Q MOBILE",
  "e-tachi": "E TACHI",
  etachi: "E TACHI",
};

const SERIES = ["note", "hot", "smart", "spark", "camon", "reno", "blade", "redmi", "galaxy", "pova", "pop", "iphone"];
const EXPANSIONS = [
  [/\bht\s?(\d)/g, "hot$1"],
  [/\bnt\s?(\d)/g, "note$1"],
  [/\bsm\s?(\d)/g, "smart$1"],
  [/\bsp\s?(\d)/g, "spark$1"],
  [/\bcam\s?(\d)/g, "camon$1"],
];
function norm(model, brand) {
  let s = ` ${model.toLowerCase()} `;
  for (const w of [brand.toLowerCase(), ...brand.toLowerCase().split(/\s+/), "galaxy", "4g", "5g"]) {
    if (w) s = s.replaceAll(` ${w} `, " ");
  }
  for (const [re, rep] of EXPANSIONS) s = s.replace(re, rep);
  // "+" means "Plus" ("X5C+" vs "X5c Plus" are the same phone)
  return s.replace(/\+/g, "plus").replace(/[^a-z0-9]/g, "");
}
function sameModel(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return long.endsWith(short) && SERIES.includes(long.slice(0, long.length - short.length));
}

function titleCase(s) {
  return s.replace(/[_-]+/g, " ").trim().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function parseSize(size) {
  const s = size.toLowerCase().trim();
  if (!s || s === "standard") return { storage: null, ram: null, extra: null };
  const ram = s.match(/(\d+)\s*gb\s*ram/);
  const storage = s.match(/(\d+)\s*(gb|tb)(?!\s*ram)/);
  if (!ram && !storage) return { storage: null, ram: null, extra: titleCase(s) };
  return {
    storage: storage ? `${storage[1]}${storage[2].toUpperCase()}` : null,
    ram: ram ? `${ram[1]}GB` : null,
    extra: null,
  };
}

function isKeypadPhone(item) {
  const flat = Object.values(item.specs ?? {}).flat();
  for (const obj of flat) {
    for (const [k, v] of Object.entries(obj ?? {})) {
      const key = k.toLowerCase(), val = String(v).toLowerCase();
      if (key === "operating system" && /proprietary|feature/.test(val)) return true;
      if (key === "screen size") {
        const inches = parseFloat(val);
        if (Number.isFinite(inches) && inches > 0 && inches < 3.2) return true;
      }
    }
  }
  return false;
}

/* ------------------------------ load crawl ------------------------------ */

const items = [];
for (const f of readdirSync(dir).filter((f) => f.startsWith("po-") && f.endsWith(".json"))) {
  items.push(...JSON.parse(readFileSync(join(dir, f), "utf8")));
}

// brand|category -> [{norm, combos, colors, minPrice, title}]
const crawlIndex = new Map();
for (const item of items) {
  if (item.section !== "phone" && item.section !== "tablet") continue;
  const inStock = (item.variants ?? []).filter((v) => v.inStock && Number.isFinite(v.price) && v.price >= 200);
  if (!item.title || inStock.length === 0) continue;

  const category = item.section === "tablet" ? "Tabs" : isKeypadPhone(item) ? "KeyPad Phones" : "New Phones";
  const brandKey = (BRAND_ALIASES[(item.brand ?? "").trim().toLowerCase()] ?? item.brand ?? "").trim().toLowerCase();

  let model = item.title.replace(new RegExp(`^\\s*${item.brand}\\s+`, "i"), "").trim();
  if (brandKey === "samsung") model = model.replace(/^galaxy\s+/i, "").trim();
  if (!model) model = item.title;

  const combos = new Map(); // "ram|storage" -> min price across colors
  const colors = new Map(); // color label (lower) -> min price across sizes
  const colorCombos = new Map(); // "color|ram|storage" -> exact price
  for (const v of inStock) {
    const { ram, storage, extra } = parseSize(v.size);
    const colorLabel = [titleCase(v.color || ""), extra].filter(Boolean).join(" ").trim().toLowerCase();
    if (ram || storage) {
      const key = `${ram ?? ""}|${storage ?? ""}`;
      combos.set(key, Math.min(combos.get(key) ?? Infinity, v.price));
      if (colorLabel) colorCombos.set(`${colorLabel}|${key}`, v.price);
    }
    if (colorLabel) colors.set(colorLabel, Math.min(colors.get(colorLabel) ?? Infinity, v.price));
  }

  const list = crawlIndex.get(`${brandKey}|${category}`) ?? [];
  list.push({
    norm: norm(model, item.brand ?? ""),
    combos,
    colors,
    colorCombos,
    minPrice: Math.min(...inStock.map((v) => v.price)),
    title: item.title,
  });
  crawlIndex.set(`${brandKey}|${category}`, list);
}
console.log(`crawl: ${items.length} items indexed under ${crawlIndex.size} brand/category buckets`);

/* ------------------------------ match + update ------------------------------ */

const { data: products, error: pe } = await supabase
  .from("products")
  .select("id, brand, model, category, price, product_variants ( id, color, ram, storage, price )")
  .in("category", ["New Phones", "KeyPad Phones", "Tabs"])
  .eq("condition", "New");
if (pe) { console.error(pe.message); process.exit(1); }
console.log(`catalog: ${products.length} New-condition phones/keypads/tabs loaded`);

const changes = [];
const unmatched = [];
let productUpdates = 0, variantUpdates = 0, unchangedCount = 0;

for (const p of products) {
  // numeric columns can arrive as strings from PostgREST
  p.price = Number(p.price);
  for (const v of p.product_variants ?? []) v.price = v.price == null ? null : Number(v.price);
  const brandKey = p.brand.trim().toLowerCase();
  const n = norm(p.model, p.brand);
  const candidates = crawlIndex.get(`${brandKey}|${p.category}`) ?? [];
  const hit = candidates.find((c) => sameModel(c.norm, n));
  if (!hit) { unmatched.push(`${p.brand} ${p.model} (${p.category})`); continue; }

  let touched = false;

  if (p.price !== hit.minPrice) {
    const swing = Math.abs(hit.minPrice - p.price) / p.price;
    changes.push(
      `${p.brand} ${p.model}: Rs. ${p.price.toLocaleString()} -> Rs. ${hit.minPrice.toLocaleString()}` +
        (swing > 0.3 ? `  [BIG SWING ${(swing * 100).toFixed(0)}% — matched "${hit.title}"]` : ""),
    );
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

console.log(`\n${dry ? "[DRY] " : ""}price updates: ${productUpdates} products, ${variantUpdates} variant rows; unchanged: ${unchangedCount}; unmatched: ${unmatched.length}`);
writeFileSync(join(dir, "price-update-log.txt"), changes.join("\n"));
writeFileSync(join(dir, "price-update-unmatched.txt"), unmatched.join("\n"));
console.log("change log -> price-update-log.txt, unmatched -> price-update-unmatched.txt");
