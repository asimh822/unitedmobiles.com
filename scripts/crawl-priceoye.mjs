// Crawls PriceOye listing + detail pages into compact po-*.json files that
// scripts/import-priceoye.mjs consumes. Skips discontinued products.
// Usage: node scripts/crawl-priceoye.mjs <out-dir> [--only=phone,watch]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2];
if (!outDir) { console.error("usage: node scripts/crawl-priceoye.mjs <out-dir>"); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);

const BASE = "https://priceoye.pk";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };

// path on priceoye -> section key understood by the importer
const SOURCES = [
  { path: "mobiles", section: "phone" },
  { path: "tablets", section: "tablet" },
  { path: "smart-watches", section: "watch" },
  { path: "wireless-earbuds", section: "earbuds" },
  { path: "bluetooth-speakers", section: "speaker" },
  { path: "mobile-chargers", section: "charger" },
  { path: "wireless-chargers", section: "charger" },
  { path: "mobile-car-chargers", section: "charger" },
  { path: "mobile-cables", section: "cable" },
  { path: "power-banks", section: "powerbank" },
];

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

/* ---------------- listing crawl: collect product URLs ---------------- */

function extractListingLinks(html, path) {
  const startAt = html.indexOf("product_list_scroll_identifier");
  if (startAt < 0) return [];
  const seg = html.slice(startAt);
  // every category uses /<path>/<brand>/<slug> product URLs
  const re = new RegExp(`href="(${BASE}/${path}/[a-z0-9-]+/[a-z0-9-]+)"`, "g");
  const urls = new Set();
  for (const m of seg.matchAll(re)) urls.add(m[1]);
  return [...urls];
}

async function crawlListing(path) {
  const urls = new Set();
  for (let page = 1; page <= 60; page++) {
    const html = await fetchText(`${BASE}/${path}?page=${page}`);
    if (!html) break;
    const links = extractListingLinks(html, path);
    const before = urls.size;
    links.forEach((u) => urls.add(u));
    process.stdout.write(`  ${path} p${page}: +${urls.size - before} (total ${urls.size})\n`);
    if (urls.size === before) break; // no new products -> past the end
    if (!/rel="next"/.test(html)) break;
  }
  return [...urls];
}

/* ---------------- detail crawl: extract window.product_data ---------------- */

function parseDetail(html, url, section) {
  const m = html.match(/window\.product_data = (\{.*?\});?\s*<\/script>/s);
  if (!m) return null;
  let d;
  try { d = JSON.parse(m[1]); } catch { return null; }
  const ds = d.dataSet ?? {};
  let specs = {};
  try { specs = JSON.parse(ds.specification || "{}"); } catch { /* optional */ }

  const variants = [];
  const dataPrices = d.product_config?.dataPrices ?? {};
  for (const [color, sizes] of Object.entries(dataPrices)) {
    for (const [size, offers] of Object.entries(sizes)) {
      const o = Array.isArray(offers) ? offers[0] : null;
      if (!o) continue;
      variants.push({
        color,
        size,
        price: parseInt(String(o.product_price ?? "").replace(/,/g, ""), 10) || null,
        retail: parseInt(String(o.retail_price ?? "").replace(/,/g, ""), 10) || null,
        inStock: !/out of stock/i.test(o.product_availability ?? "") || Number(o.stock_qty) > 0,
      });
    }
  }

  const colorImages = {};
  for (const [color, sets] of Object.entries(d.product_color_images ?? {})) {
    const imgs = sets?.large ?? sets?.medium ?? [];
    if (Array.isArray(imgs) && imgs.length) colorImages[color] = imgs;
  }

  return {
    section,
    url,
    slug: ds.slug ?? url.split("/").pop(),
    brand: ds.brand_name ?? d.brand ?? "",
    title: ds.title ?? d.product_title ?? "",
    status: ds.product_status ?? d.product_status ?? "",
    warranty: ds.warranty ?? "",
    image: d.image ?? null,
    specs,
    variants,
    colorImages,
  };
}

/* ------------------------------ main ------------------------------ */

const seenUrls = new Set();
for (const { path, section } of SOURCES) {
  if (only.length && !only.includes(section) && !only.includes(path)) continue;
  console.log(`\n== ${path} (${section}) ==`);
  const urls = (await crawlListing(path)).filter((u) => !seenUrls.has(u));
  urls.forEach((u) => seenUrls.add(u));
  console.log(`  ${urls.length} product pages to fetch`);

  let done = 0, skipped = 0;
  const items = (
    await mapLimit(urls, 6, async (url) => {
      const html = await fetchText(url);
      done++;
      if (done % 25 === 0) process.stdout.write(`  ...${done}/${urls.length}\n`);
      if (!html) return null;
      const item = parseDetail(html, url, section);
      if (!item) return null;
      if (item.status && item.status !== "launched") { skipped++; return null; }
      if (!item.variants.some((v) => v.inStock && v.price)) { skipped++; return null; }
      return item;
    })
  ).filter(Boolean);

  writeFileSync(join(outDir, `po-${path}.json`), JSON.stringify(items, null, 1));
  console.log(`  saved ${items.length} in-stock products (${skipped} discontinued/out-of-stock skipped)`);
}
console.log("\ncrawl complete");
