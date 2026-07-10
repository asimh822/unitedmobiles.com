// Imports crawled PriceOye products (po-*.json from scripts/crawl-priceoye.mjs)
// into the catalog: dedupes against existing products, re-hosts images in
// Supabase Storage, maps sections to our categories, creates color/RAM/ROM
// variants and grouped spec boxes.
// Usage: node scripts/import-priceoye.mjs <crawl-dir> [--dry]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
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

const dir = process.argv[2];
const dry = process.argv.includes("--dry");

const SECTION_MAP = {
  phone: { category: "New Phones", subcategory: null, sub_subcategory: null },
  tablet: { category: "Tabs", subcategory: null, sub_subcategory: null },
  watch: { category: "Accessories", subcategory: "Watches", sub_subcategory: null },
  earbuds: { category: "Accessories", subcategory: "Sound", sub_subcategory: "Bluetooth" },
  speaker: { category: "Accessories", subcategory: "Sound", sub_subcategory: "Bluetooth" },
  headphones: { category: "Accessories", subcategory: "Sound", sub_subcategory: "Headphones" },
  charger: { category: "Accessories", subcategory: "Chargers", sub_subcategory: null },
  cable: { category: "Accessories", subcategory: "Chargers", sub_subcategory: null },
  powerbank: { category: "Accessories", subcategory: "Gadgets", sub_subcategory: null },
};

// Scraped brand name -> our existing brand naming.
const BRAND_ALIASES = {
  xiaomi: "MI",
  mi: "MI",
  qmobile: "Q MOBILE",
  "e-tachi": "E TACHI",
  etachi: "E TACHI",
  jbl: "JBL",
};

/* ---------- model-name normalization for dedupe ---------- */
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

/* ---------- variant + spec helpers ---------- */

function titleCase(s) {
  return s
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

// "256gb - 12gb ram" -> { storage: "256GB", ram: "12GB" }; "standard" -> nulls
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

function sniffImage(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "webp";
  return null;
}

// colorImages entries may be bare filenames (relative to the PriceOye image
// CDN) and occasionally videos, which we skip.
function normalizeImageUrl(src) {
  if (!src || /\.(mp4|webm|mov)(\?|$)/i.test(src)) return null;
  return /^https?:/i.test(src) ? src : `https://images.priceoye.pk/${src.replace(/^\/+/, "")}`;
}

const uploadCache = new Map(); // source URL -> hosted public URL (or null)
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

/* ------------------------------ load ------------------------------ */

const items = [];
for (const f of readdirSync(dir).filter((f) => f.startsWith("po-") && f.endsWith(".json"))) {
  try {
    items.push(...JSON.parse(readFileSync(join(dir, f), "utf8")));
  } catch (e) {
    console.error(`bad file ${f}: ${e.message}`);
  }
}
console.log(`loaded ${items.length} crawled products`);

const { data: existing } = await supabase.from("products").select("id, brand, model, category");
const { data: brandRows } = await supabase.from("brands").select("id, name");
const brandByLower = new Map(brandRows.map((b) => [b.name.toLowerCase(), b.name]));

const existingNorms = new Map(); // category -> [{norm, label}]
for (const p of existing) {
  const list = existingNorms.get(p.category) ?? [];
  list.push({ norm: norm(p.model, p.brand), label: `${p.brand} ${p.model}` });
  existingNorms.set(p.category, list);
}

async function canonicalBrand(name) {
  const key = name.trim().toLowerCase();
  const resolved = BRAND_ALIASES[key] ?? name.trim();
  const resolvedKey = resolved.toLowerCase();
  if (brandByLower.has(resolvedKey)) return brandByLower.get(resolvedKey);
  const clean = BRAND_ALIASES[key] ? resolved : titleCase(resolved);
  if (!dry) await supabase.from("brands").insert({ name: clean, display_order: 900 });
  brandByLower.set(resolvedKey, clean);
  return clean;
}

/* ---------------- pass 1: dedupe + brand resolution (serial) ---------------- */

let deduped = 0, failed = 0;
const seen = new Set();
const skippedDupes = [];
const work = [];

for (const item of items) {
  const map = SECTION_MAP[item.section];
  const inStock = (item.variants ?? []).filter((v) => v.inStock && Number.isFinite(v.price) && v.price >= 200);
  if (!map || !item.title || inStock.length === 0) { failed++; continue; }

  const category =
    item.section === "phone" && isKeypadPhone(item) ? "KeyPad Phones" : map.category;

  const brand = await canonicalBrand(item.brand || "Assorted");
  // Model = title minus leading brand words; Samsung also drops leading "Galaxy".
  let model = item.title.replace(new RegExp(`^\\s*${item.brand}\\s+`, "i"), "").trim();
  if (brand.toUpperCase() === "SAMSUNG") model = model.replace(/^galaxy\s+/i, "").trim();
  if (!model) model = item.title;

  const n = norm(model, brand);
  const seenKey = `${brand.toLowerCase()}|${n}|${category}`;
  if (seen.has(seenKey)) { deduped++; continue; }
  seen.add(seenKey);

  const clash = (existingNorms.get(category) ?? []).find((e) => sameModel(e.norm, n));
  if (clash) { deduped++; skippedDupes.push(`${item.title} == ${clash.label}`); continue; }

  // Variants: in-stock color x size combos, crawl (color-major) order.
  const parsed = inStock
    .map((v) => ({ ...v, ...parseSize(v.size) }))
    .map((v) => ({
      ...v,
      colorLabel: [titleCase(v.color || ""), v.extra].filter(Boolean).join(" ").trim(),
    }));
  work.push({ item, map, category, brand, model, parsed });
}

/* ---------------- pass 2: images + inserts (concurrent) ---------------- */

async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (next < list.length) {
        const i = next++;
        out[i] = await fn(list[i], i);
      }
    }),
  );
  return out;
}

let inserted = 0, variantRows = 0;

async function importOne({ item, map, category, brand, model, parsed }) {
  const basePrice = Math.min(...parsed.map((v) => v.price));
  const cheapest = parsed.find((v) => v.price === basePrice);
  const isPta = category === "New Phones" || category === "KeyPad Phones" || category === "Tabs";

  if (dry) { inserted++; variantRows += parsed.length > 1 ? parsed.length : 0; return; }

  // Images: up to 3 from the cheapest variant's color, then 1 per other color.
  const colorImages = item.colorImages ?? {};
  const primaryColor = cheapest.color in colorImages ? cheapest.color : Object.keys(colorImages)[0];
  const images = [];
  const primaryList = (colorImages[primaryColor] ?? [item.image]).filter(normalizeImageUrl);
  for (const src of primaryList.slice(0, 3)) {
    const url = await hostImage(src);
    if (url) images.push(url);
  }
  const colorImageHosted = new Map(); // color -> hosted URL for variant rows
  if (primaryColor != null && images.length) colorImageHosted.set(primaryColor, images[0]);
  for (const color of Object.keys(colorImages)) {
    if (colorImageHosted.has(color)) continue;
    const url = await hostImage(colorImages[color].find(normalizeImageUrl));
    if (url) {
      colorImageHosted.set(color, url);
      if (images.length < 6) images.push(url);
    }
  }

  const { data: prod, error } = await supabase
    .from("products")
    .insert({
      brand,
      model,
      category,
      subcategory: category === "Accessories" ? map.subcategory : null,
      sub_subcategory: category === "Accessories" ? map.sub_subcategory : null,
      price: basePrice,
      ram: cheapest.ram,
      storage: cheapest.storage,
      condition: "New",
      pta_approved: isPta && !/non\s*pta/i.test(item.title),
      warranty: item.warranty
        ? /warranty/i.test(item.warranty) ? item.warranty : `${item.warranty} Warranty`
        : isPta ? "1 Year Official Warranty" : null,
      stock_status: "in_stock",
      images,
      specs: mapSpecs(item.specs),
    })
    .select("id")
    .single();
  if (error) { failed++; console.error(`FAIL ${item.title}: ${error.message}`); return; }

  // Variant rows only when there is a real choice (multiple colors or configs).
  if (parsed.length > 1) {
    const rows = parsed.map((v, i) => ({
      product_id: prod.id,
      color: v.colorLabel,
      ram: v.ram,
      storage: v.storage,
      price: v.price,
      image: colorImageHosted.get(v.color) ?? null,
      in_stock: true,
      sort_order: i,
    }));
    const { error: ve } = await supabase.from("product_variants").insert(rows);
    if (ve) console.error(`variants FAIL ${item.title}: ${ve.message}`);
    else variantRows += rows.length;
  }

  inserted++;
  if (inserted % 50 === 0) console.log(`...${inserted}/${work.length} products inserted`);
}

await mapLimit(work, 14, importOne);

console.log(`\n${dry ? "[DRY] " : ""}inserted: ${inserted} products, ${variantRows} variant rows; deduped: ${deduped}; failed/invalid: ${failed}`);
writeFileSync(join(dir, "import-dedupe-log.txt"), skippedDupes.join("\n"));
console.log("dedupe matches logged to import-dedupe-log.txt");
