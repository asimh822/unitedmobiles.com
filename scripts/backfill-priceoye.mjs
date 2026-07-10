// Backfills specs, color variants, and images for pre-existing catalog
// products — the ones scripts/import-priceoye.mjs skipped as duplicates, so
// they never got the data the product page renders (key-spec boxes, color
// swatches, gallery). Matches shop products to PriceOye detail pages by
// normalized brand+model, then fills ONLY the gaps:
//   - specs     when the product has none
//   - variants  color-only rows at the product's OWN price, when it has none
//               (Used excluded — a used unit is one specific color)
//   - images    hosted copies of PriceOye shots when the product has none
// Prices, sale prices, and stock status are never modified.
// Usage: node scripts/backfill-priceoye.mjs [--dry]
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
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

const BASE = "https://priceoye.pk";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
// Phones (incl. keypad) and tabs live in these two listings.
const PATHS = { "New Phones": "mobiles", "KeyPad Phones": "mobiles", Used: "mobiles", Tabs: "tablets" };

async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  return null;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

/* ---------- normalization (same rules as import-priceoye.mjs) ---------- */

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
  return s.replace(/[^a-z0-9]/g, "");
}
function sameModel(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return long.endsWith(short) && SERIES.includes(long.slice(0, long.length - short.length));
}

// Shop model names carry config/state noise the PriceOye slug never has:
// "(8GB+256GB)", "4+2", "256GB", "NON PTA". Strip before normalizing.
function cleanModel(model) {
  return model
    .replace(/\(.*?\)/g, " ")
    .replace(/\b\d+\s*[+/]\s*\d+\b/g, " ")
    .replace(/\b\d+\s*(gb|tb)\b/gi, " ")
    .replace(/\b(non\s*pta|pta|approved|official)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Used stock is named "BRAND <initial> MODEL" ("SAMSUNG S A15" = A15,
// "MI R 12C" = Redmi 12C) — produce one norm per interpretation.
function shopNorms(model, brand) {
  const cleaned = cleanModel(model);
  const out = [norm(cleaned, brand)];
  const m = cleaned.match(/^([a-z]{1,2})\s+(.+)$/i);
  if (m) {
    out.push(norm(m[2], brand));
    if (brandKey(brand) === "mi" && m[1].toLowerCase() === "r") out.push(norm(`redmi ${m[2]}`, brand));
  }
  return [...new Set(out)].filter(Boolean);
}

// Shop brand name -> PriceOye brand slug spelling (both sides get brandKey'd).
const BRAND_ALIASES = { mi: "xiaomi", "q mobile": "qmobile", "e tachi": "e-tachi", hmd: "hmd" };
const brandKey = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/* ---------- PriceOye crawl: listing slugs + detail parse ---------- */

function extractListingLinks(html, path) {
  const startAt = html.indexOf("product_list_scroll_identifier");
  if (startAt < 0) return [];
  const seg = html.slice(startAt);
  const re = new RegExp(`href="(${BASE}/${path}/([a-z0-9-]+)/([a-z0-9-]+))"`, "g");
  const out = new Map();
  for (const m of seg.matchAll(re)) out.set(m[1], { url: m[1], brandSlug: m[2], prodSlug: m[3] });
  return [...out.values()];
}

async function crawlListing(path) {
  const byUrl = new Map();
  for (let page = 1; page <= 60; page++) {
    const html = await fetchText(`${BASE}/${path}?page=${page}`);
    if (!html) break;
    const before = byUrl.size;
    for (const link of extractListingLinks(html, path)) byUrl.set(link.url, link);
    process.stdout.write(`  ${path} p${page}: total ${byUrl.size}\n`);
    if (byUrl.size === before) break;
    if (!/rel="next"/.test(html)) break;
  }
  return [...byUrl.values()];
}

// Unlike the crawler, keep discontinued/out-of-stock items — we only want
// their specs, colors, and images, not their availability.
function parseDetail(html) {
  const m = html.match(/window\.product_data = (\{.*?\});?\s*<\/script>/s);
  if (!m) return null;
  let d;
  try { d = JSON.parse(m[1]); } catch { return null; }
  const ds = d.dataSet ?? {};
  let specs = {};
  try { specs = JSON.parse(ds.specification || "{}"); } catch { /* optional */ }

  const colors = new Set();
  for (const color of Object.keys(d.product_config?.dataPrices ?? {})) colors.add(color);

  const colorImages = {};
  for (const [color, sets] of Object.entries(d.product_color_images ?? {})) {
    const imgs = sets?.large ?? sets?.medium ?? [];
    if (Array.isArray(imgs) && imgs.length) { colorImages[color] = imgs; colors.add(color); }
  }

  return { image: d.image ?? null, specs, colors: [...colors], colorImages };
}

/* ---------- spec + image helpers (same as import-priceoye.mjs) ---------- */

function titleCase(s) {
  return s.replace(/[_-]+/g, " ").trim().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

const BAD_VALUES = new Set(["n/a", "na", "", "-", "null", "no", "none"]);
function mapSpecs(raw) {
  const groups = [];
  for (const [category, entries] of Object.entries(raw ?? {})) {
    const items = [];
    for (const obj of Array.isArray(entries) ? entries : [entries]) {
      for (const [label, value] of Object.entries(obj ?? {})) {
        const v = String(value ?? "").trim();
        if (BAD_VALUES.has(v.toLowerCase())) continue;
        items.push({ label, value: v });
      }
    }
    if (items.length) groups.push({ category, items });
  }
  return groups;
}

function sniffImage(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "webp";
  return null;
}

function normalizeImageUrl(src) {
  if (!src || /\.(mp4|webm|mov)(\?|$)/i.test(src)) return null;
  return /^https?:/i.test(src) ? src : `https://images.priceoye.pk/${src.replace(/^\/+/, "")}`;
}

const uploadCache = new Map();
async function hostImage(rawUrl) {
  const srcUrl = normalizeImageUrl(rawUrl);
  if (!srcUrl) return null;
  if (uploadCache.has(srcUrl)) return uploadCache.get(srcUrl);
  let hosted = null;
  try {
    const res = await fetch(srcUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      const kind = sniffImage(buf);
      if (kind && buf.length > 2000) {
        const path = `catalog/${randomUUID()}.${kind}`;
        const { error } = await supabase.storage.from("product-images").upload(path, buf, {
          contentType: `image/${kind === "jpg" ? "jpeg" : kind}`,
        });
        if (!error) hosted = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      }
    }
  } catch { /* image optional */ }
  uploadCache.set(srcUrl, hosted);
  return hosted;
}

/* ------------------------------ main ------------------------------ */

// 1. Products that render an incomplete detail page.
const { data: products, error: pe } = await supabase
  .from("products")
  .select("id, brand, model, category, price, specs, images, product_variants(id, color, ram, storage, price, sale_price, in_stock, sort_order)")
  .in("category", Object.keys(PATHS));
if (pe) { console.error(pe.message); process.exit(1); }

// CSV-seeded phones have memory-only variant rows; they need each row
// duplicated per color so the chosen color survives into the checkout message.
const colorlessVariants = (p) =>
  p.category !== "Used" &&
  (p.product_variants ?? []).length > 0 &&
  p.product_variants.every((v) => !v.color);

const targets = products.filter((p) => {
  const noSpecs = !Array.isArray(p.specs) || p.specs.length === 0;
  const noVariants = (p.product_variants ?? []).length === 0 && p.category !== "Used";
  const noImages = !Array.isArray(p.images) || p.images.length === 0;
  return noSpecs || noVariants || noImages || colorlessVariants(p);
});
console.log(`${targets.length} of ${products.length} products need backfill`);
if (targets.length === 0) process.exit(0);

// 2. PriceOye listing slugs for the sections those targets live in.
const slugs = [];
for (const path of [...new Set(targets.map((t) => PATHS[t.category]))]) {
  console.log(`\n== crawling ${path} listing ==`);
  slugs.push(...(await crawlListing(path)));
}
for (const s of slugs) {
  const rawBrand = s.brandSlug.replace(/-/g, " ");
  s.brandKey = brandKey(BRAND_ALIASES[rawBrand] ?? rawBrand);
  s.norm = norm(s.prodSlug.replace(/-/g, " "), rawBrand);
}

// 3. Match each target to a slug: same brand, exact norm first, then series
//    suffix (sameModel), shortest candidate wins ties.
const matched = []; // { product, url, html? }
const pending = [];
const unmatched = [];
for (const t of targets) {
  const rawBrand = t.brand.toLowerCase();
  const bKey = brandKey(BRAND_ALIASES[rawBrand] ?? t.brand);
  const norms = shopNorms(t.model, t.brand);
  const sameBrand = slugs.filter((s) => s.brandKey === bKey);
  const pick =
    sameBrand.find((s) => norms.includes(s.norm)) ??
    sameBrand
      .filter((s) => norms.some((n) => sameModel(s.norm, n)))
      .sort((a, b) => a.norm.length - b.norm.length)[0];
  if (pick) matched.push({ product: t, url: pick.url });
  else pending.push(t);
}
console.log(`\nlisting matched ${matched.length}; probing guessed URLs for ${pending.length} more`);

// 3b. Listings only show current models; discontinued and just-launched ones
//     still have live detail pages, so probe guessed URLs for the rest.
const REVERSE_BRAND = { mi: "xiaomi", "q mobile": "qmobile", "e tachi": "e-tachi" };
function guessUrls(t) {
  const path = PATHS[t.category];
  const brandSlug = (REVERSE_BRAND[t.brand.toLowerCase()] ?? t.brand).toLowerCase().trim().replace(/\s+/g, "-");
  let m = cleanModel(t.model).toLowerCase();
  const first = m.match(/^([a-z]{1,2})\s+(.+)$/);
  if (first) m = brandSlug === "xiaomi" && first[1] === "r" ? `redmi ${first[2]}` : first[2];
  let s = ` ${m} `;
  for (const [re, rep] of EXPANSIONS) s = s.replace(re, rep);
  const base = s.trim().replace(/[^a-z0-9]+/g, "-");
  const forms = new Set([base]);
  forms.add(base.replace(/([a-z]{2,})(\d)/g, "$1-$2")); // note60 -> note-60
  forms.add(base.replace(/(\d)([a-z]{2,})/g, "$1-$2")); // v50lite -> v50-lite
  forms.add(base.replace(/-[a-z]$/, "")); // a16-u -> a16 (used-grade suffix)
  if (brandSlug === "nokia") forms.add(base.replace(/^n-?(?=\d)/, "")); // n106 -> 106
  const urls = [];
  for (const f of forms) {
    urls.push(`${BASE}/${path}/${brandSlug}/${brandSlug}-${f}`);
    if (brandSlug === "samsung") urls.push(`${BASE}/${path}/${brandSlug}/samsung-galaxy-${f}`);
  }
  return urls;
}

await mapLimit(pending, 6, async (t) => {
  for (const url of guessUrls(t)) {
    const html = await fetchText(url);
    if (html && html.includes("window.product_data")) {
      matched.push({ product: t, url, html });
      return;
    }
  }
  unmatched.push(`${t.category}: ${t.brand} ${t.model}`);
});
console.log(`matched ${matched.length}, unmatched ${unmatched.length}`);
writeFileSync(join(root, "scripts", "backfill-unmatched.txt"), unmatched.join("\n"));
if (unmatched.length) console.log("unmatched list -> scripts/backfill-unmatched.txt");

// 4. Fetch details and fill the gaps.
let specsSet = 0, variantsSet = 0, variantsExpanded = 0, imagesSet = 0, failed = 0;

await mapLimit(matched, 6, async ({ product, url, html }) => {
  const page = html ?? (await fetchText(url));
  const item = page && parseDetail(page);
  if (!item) { failed++; console.error(`no data: ${url}`); return; }

  const update = {};

  const specs = mapSpecs(item.specs);
  if ((!Array.isArray(product.specs) || product.specs.length === 0) && specs.length > 0) {
    update.specs = specs;
  }

  // Hosted gallery when the product has no photos at all.
  const hasImages = Array.isArray(product.images) && product.images.length > 0;
  const firstColor = Object.keys(item.colorImages)[0];
  const colorImageHosted = new Map();
  let gallery = [];
  if (!hasImages) {
    const sources = (item.colorImages[firstColor] ?? [item.image]).filter(normalizeImageUrl).slice(0, 3);
    if (dry) {
      if (sources.length) update.images = sources; // count only; nothing uploaded
    } else {
      for (const src of sources) {
        const url = await hostImage(src);
        if (url) gallery.push(url);
      }
      if (firstColor != null && gallery.length) colorImageHosted.set(firstColor, gallery[0]);
      if (gallery.length) update.images = gallery;
    }
  }

  if (!dry && Object.keys(update).length > 0) {
    const { error } = await supabase.from("products").update(update).eq("id", product.id);
    if (error) { failed++; console.error(`FAIL ${product.brand} ${product.model}: ${error.message}`); return; }
  }
  if (update.specs) specsSet++;
  if (update.images) imagesSet++;

  // Color variant rows (never for Used — a used unit is one specific color).
  const existing = [...(product.product_variants ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const needVariants = existing.length === 0 && product.category !== "Used";
  const colors = item.colors.slice(0, 8);
  if (colors.length === 0) return;

  const hostedColorImage = async (color) => {
    if (colorImageHosted.has(color)) return colorImageHosted.get(color);
    const src = (item.colorImages[color] ?? []).find(normalizeImageUrl);
    const url = src && !dry ? await hostImage(src) : null;
    colorImageHosted.set(color, url);
    return url;
  };

  if (needVariants) {
    // No variants at all: color-only rows at the product's own price.
    const rows = [];
    for (const [i, color] of colors.entries()) {
      rows.push({
        product_id: product.id,
        color: titleCase(color),
        ram: null,
        storage: null,
        price: product.price,
        image: await hostedColorImage(color),
        in_stock: true,
        sort_order: i,
      });
    }
    if (!dry) {
      const { error } = await supabase.from("product_variants").insert(rows);
      if (error) { console.error(`variants FAIL ${product.brand} ${product.model}: ${error.message}`); return; }
    }
    variantsSet++;
  } else if (colorlessVariants(product)) {
    // Memory-only rows: duplicate each per color (keeping that row's exact
    // price/sale price), then drop the colorless originals.
    const rows = [];
    for (const [c, color] of colors.entries()) {
      const image = await hostedColorImage(color);
      for (const [m, v] of existing.entries()) {
        rows.push({
          product_id: product.id,
          color: titleCase(color),
          ram: v.ram,
          storage: v.storage,
          price: v.price,
          sale_price: v.sale_price ?? null,
          image,
          in_stock: v.in_stock ?? true,
          sort_order: c * existing.length + m,
        });
      }
    }
    if (!dry) {
      const { error } = await supabase.from("product_variants").insert(rows);
      if (error) { console.error(`expand FAIL ${product.brand} ${product.model}: ${error.message}`); return; }
      const { error: de } = await supabase
        .from("product_variants")
        .delete()
        .in("id", existing.map((v) => v.id));
      if (de) { console.error(`cleanup FAIL ${product.brand} ${product.model}: ${de.message}`); return; }
    }
    variantsExpanded++;
  }
});

console.log(
  `\n${dry ? "[DRY] " : ""}specs filled: ${specsSet}, color variants added: ${variantsSet}, memory variants expanded with colors: ${variantsExpanded}, galleries added: ${imagesSet}, failed: ${failed}`,
);
