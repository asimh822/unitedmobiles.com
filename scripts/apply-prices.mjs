// Applies researched PKR prices to products and their memory-config variants.
// Usage: node scripts/apply-prices.mjs <prices.json>
// prices.json: [{id, name, prices: [{config: "4GB+64GB"|null, pkr}], status, source}]
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

const entries = JSON.parse(readFileSync(process.argv[2], "utf8"));
let updated = 0;
const skipped = [];

for (const entry of entries) {
  const prices = (entry.prices ?? []).filter((p) => Number.isFinite(p.pkr) && p.pkr >= 1000);
  if (entry.status === "not_found" || prices.length === 0) {
    skipped.push(`${entry.name}: ${entry.status}`);
    continue;
  }

  const minPrice = Math.min(...prices.map((p) => p.pkr));
  const { error } = await supabase.from("products").update({ price: minPrice }).eq("id", entry.id);
  if (error) {
    skipped.push(`${entry.name}: ${error.message}`);
    continue;
  }

  // Per-config variant prices (match on ram+storage).
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, ram, storage")
    .eq("product_id", entry.id);
  for (const v of variants ?? []) {
    const key = `${v.ram ?? ""}+${v.storage ?? ""}`;
    const match =
      prices.find((p) => p.config && p.config.replace(/\s/g, "") === key.replace(/\s/g, "")) ??
      (prices.length === 1 ? prices[0] : null);
    if (match) {
      await supabase.from("product_variants").update({ price: match.pkr }).eq("id", v.id);
    }
  }
  console.log(`OK  ${entry.name}: Rs. ${minPrice.toLocaleString("en-US")}${prices.length > 1 ? ` (+${prices.length - 1} configs)` : ""} [${entry.status}]`);
  updated++;
}

console.log(`\nUpdated: ${updated}, Skipped: ${skipped.length}`);
for (const s of skipped) console.log("SKIP", s);
