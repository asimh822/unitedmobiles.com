// Backfills category values on existing products and seeds the brands table.
// Run AFTER applying supabase/migrations/002_categories_brands.sql.
// Usage: node scripts/backfill-categories.mjs
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

// Known keypad/feature-phone models in the current catalog (matched on model prefix).
const KEYPAD_MODELS = [
  "2166IT", "IT2181", "IT5032", "M450", "MAGIC4", "NEO X30",           // itel feature phones
  "105", "106", "110", "N 110", "N106", "N230", "N5310", "130", "150", // Nokia keypad
  "C2 2.0", "D1 2.4",                                                   // Digit keypad
  "V BOLD", "FLEXI V", "V GLOW", "THUNDER",                             // Voice keypad
  "Q CLASSIC", "Q6303", "QPRIME",                                       // QMobile keypad
  "IPRO MAX", "V200S", "V101",                                          // E-Tachi / Villaon / SEGO Value keypad
];

// Homepage brand order: major smartphone brands first, then the rest.
const BRAND_ORDER = [
  "SAMSUNG", "VIVO", "OPPO", "REALME", "INFINIX", "TECNO", "XIAOMI", "MI",
  "ITEL", "HONOR", "ZTE", "NOKIA", "HMD", "SEGO", "APPLE", "GOOGLE", "ONEPLUS",
];

function categoryFor(p) {
  const model = (p.model ?? "").toUpperCase().trim();
  const brand = (p.brand ?? "").toUpperCase().trim();
  if (brand === "TABS" || model.includes("TAB")) return "Tabs";
  // The desktop CSV stores used phones under brand "USED".
  if (brand === "USED" || model.startsWith("USED") || p.condition === "Used") return "Used";
  if (KEYPAD_MODELS.some((k) => model.startsWith(k.toUpperCase()))) return "KeyPad Phones";
  if (brand === "NOKIA" || brand === "VOICE" || brand === "DIGIT" || brand === "Q MOBILE" || brand === "VILLAON" || brand === "E TACHI") {
    return "KeyPad Phones"; // these brands only sell keypad phones in this catalog
  }
  return "New Phones";
}

const { data: products, error } = await supabase.from("products").select("id, brand, model, condition, category");
if (error) throw new Error(error.message);

const counts = {};
for (const p of products) {
  const category = categoryFor(p);
  counts[category] = (counts[category] ?? 0) + 1;
  const patch = { category };
  if (category === "Used") patch.condition = "Used";
  if (p.category !== category || (category === "Used" && p.condition !== "Used")) {
    const { error: uErr } = await supabase.from("products").update(patch).eq("id", p.id);
    if (uErr) throw new Error(`${p.brand} ${p.model}: ${uErr.message}`);
  }
}
console.log("Category backfill:", JSON.stringify(counts));

// "USED" is a condition, not a brand — keep it out of the brands table.
await supabase.from("brands").delete().eq("name", "USED");

// Seed brands from distinct product brands, ordered sensibly.
const names = [...new Set(products.map((p) => p.brand.trim()))].sort();
const rows = names.map((name) => {
  const i = BRAND_ORDER.indexOf(name.toUpperCase());
  return { name, display_order: i >= 0 ? (i + 1) * 10 : 900 };
});
const { error: bErr } = await supabase.from("brands").upsert(rows, { onConflict: "name" });
if (bErr) throw new Error(bErr.message);
console.log(`Brands seeded: ${rows.length}`);
