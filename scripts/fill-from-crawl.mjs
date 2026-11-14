// Fills gaps on EXISTING catalog products from a targeted PriceOye crawl.
// backfill-priceoye.mjs guesses detail URLs from the model name and misses
// irregular slugs (e.g. samsung-galaxy-a27-fiveg), so this takes the pairing
// explicitly: --map="<product-id>=<priceoye-url>" (repeatable).
// Fills empty specs and empty images; rebuilds the colour/config variant rows
// only when --variants is passed. Never touches product price.
// Usage:
//   node scripts/fill-from-crawl.mjs <crawl-dir> --map=<id>=<url> [--variants] [--inherit-prices] [--dry]
//   --inherit-prices  write variant price as null so every row inherits the
//                     product's own price. Use when the shop price is hand-set
//                     and PriceOye's number would undercut it.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { serviceClient, titleCase, parseSize } from "./priceoye-match.mjs";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/fill-from-crawl.mjs <crawl-dir> --map=<id>=<url> [--variants] [--dry]");
  process.exit(1);
}
const dry = process.argv.includes("--dry");
const doVariants = process.argv.includes("--variants");
const inheritPrices = process.argv.includes("--inherit-prices");
const pairs = process.argv
  .filter((a) => a.startsWith("--map="))
  .map((a) => {
    const rest = a.slice(6);
    const i = rest.indexOf("=");
    return { id: rest.slice(0, i), url: rest.slice(i + 1) };
  });
if (!pairs.length) { console.error("no --map=<id>=<url> given"); process.exit(1); }
const supabase = serviceClient();

const items = [];
for (const f of readdirSync(dir).filter((f) => f.startsWith("po-") && f.endsWith(".json"))) {
  items.push(...JSON.parse(readFileSync(join(dir, f), "utf8")));
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

const IMG_HOST = "https://images.priceoye.pk/";
function normalizeImageUrl(src) {
  if (!src) return null;
  if (/^https?:\/\//.test(src)) return src;
  return IMG_HOST + String(src).replace(/^\/+/, "");
}
function sniffImage(buf) {
  const b = new Uint8Array(buf);
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50) return "png";
  if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;
}
const uploadCache = new Map();
async function hostImage(raw) {
  const src = normalizeImageUrl(raw);
  if (!src) return null;
  if (uploadCache.has(src)) return uploadCache.get(src);
  try {
    const res = await fetch(src, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 2000) return null;
    const ext = sniffImage(buf);
    if (!ext) return null;
    const path = `catalog/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, Buffer.from(buf), { contentType: `image/${ext === "jpg" ? "jpeg" : ext}` });
    if (error) return null;
    const url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    uploadCache.set(src, url);
    return url;
  } catch {
    return null;
  }
}

for (const { id, url } of pairs) {
  const item = items.find((i) => i.url === url);
  if (!item) { console.error(`SKIP ${id}: ${url} not in crawl`); continue; }
  const { data: p, error } = await supabase
    .from("products")
    .select("id, brand, model, price, images, specs")
    .eq("id", id)
    .single();
  if (error || !p) { console.error(`SKIP ${id}: ${error?.message ?? "not found"}`); continue; }

  const patch = {};
  const specs = mapSpecs(item.specs);
  if (!(p.specs ?? []).length && specs.length) patch.specs = specs;

  const colorImages = item.colorImages ?? {};
  const colorHosted = new Map();
  if (!(p.images ?? []).length) {
    const images = [];
    const first = Object.keys(colorImages)[0];
    for (const src of (colorImages[first] ?? [item.image]).slice(0, 3)) {
      const u = await hostImage(src);
      if (u) images.push(u);
    }
    if (first != null && images.length) colorHosted.set(first, images[0]);
    for (const color of Object.keys(colorImages)) {
      if (colorHosted.has(color)) continue;
      const u = await hostImage(colorImages[color].find(Boolean));
      if (u) { colorHosted.set(color, u); if (images.length < 6) images.push(u); }
    }
    if (images.length) patch.images = images;
  }

  console.log(`${p.brand} ${p.model} (${id})`);
  console.log(`  specs:  ${(p.specs ?? []).length} groups -> ${patch.specs ? patch.specs.length : "unchanged"}`);
  console.log(`  images: ${(p.images ?? []).length} -> ${patch.images ? patch.images.length : "unchanged"}`);

  let rows = null;
  if (doVariants) {
    rows = [];
    let n = 0;
    for (const v of item.variants) {
      if (!v.price) continue;
      const { ram, storage } = parseSize(v.size ?? "");
      rows.push({
        product_id: id,
        color: titleCase(v.color ?? ""),
        color_hex: null,
        ram,
        storage,
        price: inheritPrices ? null : Number(v.price),
        sale_price: null,
        image: colorHosted.get(v.color) ?? null,
        in_stock: Boolean(v.inStock),
        sort_order: n++,
      });
    }
    console.log(
      `  variants -> ${rows.length} rows: ` +
        rows
          .map((r) => `${r.color} ${r.ram}/${r.storage} @${r.price ?? "inherit"}${r.in_stock ? "" : " (OOS)"}`)
          .join(", "),
    );
  }

  if (dry) { console.log("  [dry] nothing written\n"); continue; }
  if (Object.keys(patch).length) {
    const { error: pe } = await supabase.from("products").update(patch).eq("id", id);
    if (pe) { console.error(`  FAIL product: ${pe.message}`); continue; }
  }
  if (rows) {
    await supabase.from("product_variants").delete().eq("product_id", id);
    const { error: ve } = await supabase.from("product_variants").insert(rows);
    if (ve) console.error(`  FAIL variants: ${ve.message}`);
  }
  console.log("  written\n");
}
