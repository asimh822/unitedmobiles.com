// Applies researched official press images to products.
// Usage: node scripts/apply-press-images.mjs <results.json>
// results.json: [{id, catalog_name, resolved, status, source_page, images: [urls], note}]
//
// Only images hosted on official manufacturer domains are accepted; everything
// else is rejected and reported. Downloads each image, verifies it is a real
// raster image, uploads to the product-images bucket, updates products.images.
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

// Official manufacturer domains (suffix match on hostname).
const OFFICIAL = [
  "samsung.com", "samsungmobilepress.com",
  "infinixmobility.com", "infinixmobiles.pk", "infinix.com",
  "tecno-mobile.com", "tecnomobile.pk",
  "d13pvy8xd75yde.cloudfront.net", // Tecno's CDN — verified referenced from tecno-mobile.com
  "itel-life.com", "itel.com", "itelmobiles.pk", "itel-pk.com",
  "hmd.com", "nokia.com",
  "oppo.com", "oppomobile.com", "coloros.com", "heytapimage.com", "oppoimg.com",
  "vivo.com", "vivoglobal.com", "vivo.com.pk",
  "realme.com", "realmemobiles.pk", "realme.net", // realme.net = realme's CDN, verified from realme.com/pk HTML
  "mi.com", "xiaomi.com", "appmifile.com", "xiaomiimg.com",
  "hihonor.com", "honor.com",
  "ztedevices.com", "zte.com.cn",
  "qmobile.com.pk", "digit4g.com", "jazz.com.pk",
  "etachimobile.com", "e-tachi.com", "segoexperience.com", "villaon.com",
  "voicemobile.com.pk",
];

// Manufacturer-owned CDN spaces on shared hosts, verified against the brand's
// own site (host + required path prefix).
const OFFICIAL_CDN_PATHS = [
  { host: "images.ctfassets.net", prefix: "/wcfotm6rrl7u/" }, // HMD/Nokia Contentful space
  { host: "cdn.shopify.com", prefix: "/s/files/1/0750/9377/0553/" }, // QMobile's Shopify store
  { host: "cdn.shopify.com", prefix: "/s/files/1/0703/9657/5998/" }, // SEGO's Shopify store
];

function isOfficial(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (OFFICIAL.some((d) => host === d || host.endsWith("." + d))) return true;
    return OFFICIAL_CDN_PATHS.some((c) => host === c.host && u.pathname.startsWith(c.prefix));
  } catch {
    return false;
  }
}

function sniffImage(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "webp";
  return null;
}

const resultsPath = process.argv[2];
if (!resultsPath) {
  console.error("Usage: node scripts/apply-press-images.mjs <results.json>");
  process.exit(1);
}
const entries = JSON.parse(readFileSync(resultsPath, "utf8"));

const report = { updated: [], flagged: [], rejected_urls: [] };

for (const entry of entries) {
  const label = `${entry.catalog_name} (${entry.resolved ?? "?"})`;
  if (entry.status !== "found" || !entry.images?.length) {
    report.flagged.push({ ...entry, reason: entry.status });
    continue;
  }

  const stored = [];
  for (const [i, rawUrl] of entry.images.slice(0, 3).entries()) {
    const url = rawUrl.replace(/&amp;/g, "&");
    if (!isOfficial(url)) {
      report.rejected_urls.push({ product: label, url, reason: "non-official domain" });
      continue;
    }
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        redirect: "follow",
      });
      if (!res.ok) {
        report.rejected_urls.push({ product: label, url, reason: `HTTP ${res.status}` });
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const kind = sniffImage(buf);
      if (!kind || buf.length < 5000) {
        report.rejected_urls.push({ product: label, url, reason: kind ? "too small" : "not a raster image" });
        continue;
      }
      const path = `press/${entry.id}-${i}.${kind}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, buf, { contentType: `image/${kind === "jpg" ? "jpeg" : kind}`, upsert: true });
      if (error) {
        report.rejected_urls.push({ product: label, url, reason: `upload: ${error.message}` });
        continue;
      }
      stored.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      report.rejected_urls.push({ product: label, url, reason: e.message });
    }
  }

  if (stored.length === 0) {
    report.flagged.push({ ...entry, reason: "all image URLs failed validation" });
    continue;
  }

  const { error } = await supabase.from("products").update({ images: stored }).eq("id", entry.id);
  if (error) {
    report.flagged.push({ ...entry, reason: `db update: ${error.message}` });
  } else {
    report.updated.push({ product: label, count: stored.length, source: entry.source_page });
    console.log(`OK  ${label} — ${stored.length} image(s)`);
  }
}

console.log(`\nUpdated: ${report.updated.length}, Flagged: ${report.flagged.length}, Rejected URLs: ${report.rejected_urls.length}`);
console.log("__REPORT__" + JSON.stringify(report));
