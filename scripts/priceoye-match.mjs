// Shared helpers for the PriceOye scripts: env/Supabase client, brand + model
// normalisation, size parsing, keypad detection, and a paged catalog fetch.
// Used by update-prices-priceoye.mjs and remove-priceoye-oos.mjs (the importer
// and backfill still carry their own copies of norm/sameModel — keep in sync).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadEnv() {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

export function serviceClient() {
  loadEnv();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export const BRAND_ALIASES = {
  xiaomi: "MI",
  mi: "MI",
  qmobile: "Q MOBILE",
  hmd: "NOKIA", // HMD is the Nokia successor; the shop files these under NOKIA
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

export function norm(model, brand) {
  let s = ` ${model.toLowerCase()} `;
  // "nubia" is ZTE's sub-brand — PriceOye titles say "ZTE Nubia A36" for the
  // phone the shop files as plain "ZTE A36", so it's noise like "galaxy".
  for (const w of [brand.toLowerCase(), ...brand.toLowerCase().split(/\s+/), "galaxy", "nubia", "4g", "5g"]) {
    if (w) s = s.replaceAll(` ${w} `, " ");
  }
  for (const [re, rep] of EXPANSIONS) s = s.replace(re, rep);
  // "+" means "Plus" ("X5C+" vs "X5c Plus" are the same phone)
  return s.replace(/\+/g, "plus").replace(/[^a-z0-9]/g, "");
}

export function sameModel(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return long.endsWith(short) && SERIES.includes(long.slice(0, long.length - short.length));
}

export function titleCase(s) {
  return s.replace(/[_-]+/g, " ").trim().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function parseSize(size) {
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

/** Brands that only ever sell feature phones in this catalog. Deliberately
 *  EXCLUDES Nokia and Digit: Nokia Aura 2 runs Android 14 Go and Digit Cygnal 4
 *  is an Android phone, so a blanket brand rule would misfile both. */
export const KEYPAD_ONLY_BRANDS = new Set(["voice", "q mobile", "villaon", "e tachi"]);

/** True when the spec block names a real smartphone OS — used to veto the brand
 *  rule if one of the keypad-only brands ever ships an Android handset. */
function specsProveSmartphone(item) {
  for (const obj of Object.values(item.specs ?? {}).flat()) {
    for (const [k, v] of Object.entries(obj ?? {})) {
      if (k.toLowerCase() === "operating system" && /android|ios|harmony|windows/i.test(String(v))) return true;
    }
  }
  return false;
}

export function isKeypadPhone(item) {
  const flat = Object.values(item.specs ?? {}).flat();
  let standardFields = 0;
  for (const obj of flat) {
    for (const [k, v] of Object.entries(obj ?? {})) {
      const key = k.toLowerCase(), val = String(v).toLowerCase().trim();
      if (key === "operating system") {
        // "propriet" (not "proprietary") because PriceOye ships the typo
        // "Propriety OS" on several feature phones, e.g. Villaon V105.
        if (/propriet|features*phone|kaios|seriess*30|s30+/.test(val)) return true;
      }
      // PriceOye writes "Standard" in OS/RAM/Internal Memory for feature phones.
      if (val === "standard" && ["operating system", "ram", "internal memory"].includes(key)) standardFields++;
      if (key === "screen size") {
        // Values arrive in inches OR centimetres ("5.8CM" = 2.28in, itel it2181).
        let n = parseFloat(val);
        if (/cm/.test(val)) n /= 2.54;
        if (Number.isFinite(n) && n > 0 && n < 3.2) return true;
      }
    }
  }
  return standardFields >= 2;
}

/** Lower-cased brand key with aliases applied — use for BOTH crawl and catalog brands. */
export function brandKey(brand) {
  const raw = (brand ?? "").trim().toLowerCase();
  return (BRAND_ALIASES[raw] ?? raw).trim().toLowerCase();
}

const PHONE_CATEGORIES = ["New Phones", "KeyPad Phones"];

/** Bucket keys to search for a catalog product, own category first. PriceOye
 *  has one "mobiles" list and our keypad detection is a heuristic, so a phone
 *  may sit in the other phone bucket. */
export function bucketsFor(brand, category) {
  const b = brandKey(brand);
  if (!PHONE_CATEGORIES.includes(category)) return [`${b}|${category}`];
  return [category, ...PHONE_CATEGORIES.filter((c) => c !== category)].map((c) => `${b}|${c}`);
}

/** Catalog category + brand key + normalised model for a crawled phone/tablet item. */
export function crawlIdentity(item) {
  const b = brandKey(item.brand);
  const keypad = isKeypadPhone(item) || (KEYPAD_ONLY_BRANDS.has(b) && !specsProveSmartphone(item));
  const category = item.section === "tablet" ? "Tabs" : keypad ? "KeyPad Phones" : "New Phones";
  let model = (item.title ?? "").replace(new RegExp(`^\\s*${item.brand}\\s+`, "i"), "").trim();
  if (b === "samsung") model = model.replace(/^galaxy\s+/i, "").trim();
  if (!model) model = item.title ?? "";
  return { category, brandKey: b, model, norm: norm(model, item.brand ?? ""), bucket: `${b}|${category}` };
}

/** PostgREST caps a select at 1000 rows — page through the whole result.
 *  `buildQuery` must return a fresh builder each call. */
export async function fetchAll(buildQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}
