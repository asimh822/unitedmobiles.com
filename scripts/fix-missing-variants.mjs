// Repairs products that were inserted by import-priceoye.mjs but lost their
// variant rows to a mid-run Supabase outage (29 Sep 2026: Cloudflare 525s).
// Insert-only and idempotent: skips any product that already has variant rows.
// Usage: node scripts/fix-missing-variants.mjs <crawl-dir> <product-id...> [--dry] [--markup=N]
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { crawlIdentity, parseSize, serviceClient, titleCase } from "./priceoye-match.mjs";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const markup = parseInt((args.find((a) => a.startsWith("--markup=")) ?? "--markup=0").slice(9), 10) || 0;
const positional = args.filter((a) => !a.startsWith("--"));
const [dir, ...ids] = positional;
if (!dir || ids.length === 0) {
  console.error("usage: node scripts/fix-missing-variants.mjs <crawl-dir> <product-id...> [--dry] [--markup=N]");
  process.exit(1);
}
const supabase = serviceClient();

const items = [];
for (const f of readdirSync(dir).filter((f) => f.startsWith("po-") && f.endsWith(".json"))) {
  items.push(...JSON.parse(readFileSync(join(dir, f), "utf8")));
}
// brand-key|normalised-model -> crawl item (phones/tablets only)
const byIdentity = new Map();
for (const item of items) {
  if (item.section !== "phone" && item.section !== "tablet") continue;
  const id = crawlIdentity(item);
  byIdentity.set(`${id.brandKey}|${id.norm}`, item);
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
async function hostImage(rawUrl) {
  const srcUrl = normalizeImageUrl(rawUrl);
  if (!srcUrl) return null;
  try {
    const res = await fetch(srcUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const kind = sniffImage(buf);
    if (!kind || buf.length <= 2000) return null;
    const path = `catalog/${randomUUID()}.${kind}`;
    const { error } = await supabase.storage.from("product-images").upload(path, buf, {
      contentType: `image/${kind === "jpg" ? "jpeg" : kind}`,
    });
    return error ? null : supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

for (const id of ids) {
  const { data: p, error } = await supabase
    .from("products")
    .select("id, brand, model, category, price, product_variants ( id )")
    .eq("id", id)
    .maybeSingle();
  if (error) { console.error(`${id}: ${error.message}`); continue; }
  if (!p) { console.error(`${id}: no such product`); continue; }
  if ((p.product_variants ?? []).length > 0) {
    console.log(`SKIP ${p.brand} ${p.model}: already has ${p.product_variants.length} variant rows`);
    continue;
  }

  // Find the crawl item the importer matched this product to.
  const probe = crawlIdentity({ section: "phone", brand: p.brand, title: `${p.brand} ${p.model}` });
  const item = byIdentity.get(`${probe.brandKey}|${probe.norm}`);
  if (!item) { console.error(`NO CRAWL MATCH ${p.brand} ${p.model} — leave for manual entry`); continue; }

  const parsed = (item.variants ?? [])
    .filter((v) => v.inStock && Number.isFinite(v.price) && v.price >= 200)
    .map((v) => ({ ...v, price: v.price + markup, ...parseSize(v.size) }))
    .map((v) => ({ ...v, colorLabel: [titleCase(v.color || ""), v.extra].filter(Boolean).join(" ").trim() }));
  if (parsed.length <= 1) {
    console.log(`SKIP ${p.brand} ${p.model}: single variant — importer would not create rows either`);
    continue;
  }

  console.log(`${p.brand} ${p.model}: inserting ${parsed.length} variant rows${dry ? " [DRY]" : ""}`);
  if (dry) {
    for (const v of parsed) console.log(`  ${[v.colorLabel, v.ram, v.storage].filter(Boolean).join(" / ")} — Rs. ${v.price.toLocaleString()}`);
    continue;
  }

  const colorImageHosted = new Map();
  for (const color of Object.keys(item.colorImages ?? {})) {
    const url = await hostImage((item.colorImages[color] ?? []).find(normalizeImageUrl));
    if (url) colorImageHosted.set(color, url);
  }

  const rows = parsed.map((v, i) => ({
    product_id: p.id,
    color: v.colorLabel,
    ram: v.ram,
    storage: v.storage,
    price: v.price,
    image: colorImageHosted.get(v.color) ?? null,
    in_stock: true,
    sort_order: i,
  }));
  const { error: ve } = await supabase.from("product_variants").insert(rows);
  console.log(ve ? `  FAIL: ${ve.message}` : `  inserted ${rows.length} rows`);
}
