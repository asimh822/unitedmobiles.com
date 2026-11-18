// Fill the /build match fields (migration 007) from each phone's spec groups
// and RAM/storage variants, and report the phones that could not be parsed.
//
//   node scripts/parse-match-specs.mjs           report only (default, writes nothing)
//   node scripts/parse-match-specs.mjs --apply   write empty columns
//   node scripts/parse-match-specs.mjs --apply --force   also overwrite values already set
//
// Without --force a value already in the column is treated as a hand
// correction and left alone. Pre-Owned (EPOS) handsets have no spec sheet:
// they borrow screen/battery/camera from the same model in New Phones. RAM and
// storage are only ever the handset's own (left empty if the EPOS has none). The /build page runs the same parser live for any row
// still null, so this script is a cache/override, not a requirement.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, serviceClient } from "./priceoye-match.mjs";
import { findDonor, isMatchable, missingFields, parseMatchFields } from "../lib/match-specs.ts";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const COLS = { screenIn: "screen_in", batteryMah: "battery_mah", mainCamMp: "main_cam_mp", lensCount: "lens_count", ramGb: "ram_gb", storageGb: "storage_gb" };

const sb = serviceClient();

const base = "id, brand, model, category, source, ram, storage, specs, product_variants(ram, storage)";
let hasCols = true;
let { data: rows, error } = await sb
  .from("products")
  .select(`${base}, ${Object.values(COLS).join(", ")}`)
  .in("category", ["New Phones", "Used"]);
if (error) {
  hasCols = false;
  console.log(`! Match columns not readable (${error.message}). Migration 007 not applied yet: report only.\n`);
  ({ data: rows, error } = await sb.from("products").select(base).in("category", ["New Phones", "Used"]));
  if (error) throw error;
}

const asProduct = (r) => ({ ...r, variants: r.product_variants ?? [] });
const catalog = rows.filter((r) => r.category === "New Phones");

const results = rows.map((r) => {
  let f = parseMatchFields(asProduct(r));
  let donor = null;
  if (r.category === "Used") {
    donor = findDonor(r, catalog);
    if (donor) {
      const d = parseMatchFields(asProduct(donor));
      // Screen/battery/camera from the donor; RAM/storage only ever the handset's own.
      f = { ...d, ramGb: f.ramGb, storageGb: f.storageGb };
    }
  }
  return { r, f, donor, missing: missingFields(f), matchable: isMatchable(f, r.category === "Used") };
});

const name = (r) => `${r.brand} ${r.model}`;
const bad = results.filter((x) => x.missing.length);
console.log(`${results.length} phones (New Phones + Pre-Owned). Fully parsed: ${results.length - bad.length}. Gaps: ${bad.length}.\n`);
if (bad.length) {
  console.log("Could not parse (missing fields):");
  for (const x of bad) {
    const tag = x.r.category === "Used" ? `Pre-Owned${x.donor ? `, specs from ${name(x.donor)}` : ", no matching New Phones model"}` : "New";
    console.log(`  ${x.matchable ? "partial " : "SKIPPED "} ${name(x.r).padEnd(34)} [${tag}]  missing: ${x.missing.join(", ")}`);
  }
  console.log("\n  SKIPPED = left out of /build (needs screen, battery or camera, and for New Phones RAM or storage).");
}

const report = results.map((x) => ({ id: x.r.id, name: name(x.r), category: x.r.category, donor: x.donor ? name(x.donor) : null, ...x.f, missing: x.missing }));
const out = join(root, "scripts", "match-specs-report.json");
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\nFull table: ${out}`);

if (!APPLY) {
  console.log("\nReport only. Re-run with --apply to write.");
  process.exit(0);
}
if (!hasCols) {
  console.log("\nCannot --apply before migration 007 is run.");
  process.exit(1);
}

let updated = 0;
for (const { r, f } of results) {
  const patch = {};
  for (const [k, col] of Object.entries(COLS)) {
    const v = f[k];
    if (v == null) continue;
    const val = col === "battery_mah" || col === "storage_gb" || col === "lens_count" ? Math.round(v) : v;
    if (r[col] == null || (FORCE && Number(r[col]) !== val)) patch[col] = val;
  }
  if (!Object.keys(patch).length) continue;
  const { error: e } = await sb.from("products").update(patch).eq("id", r.id);
  if (e) console.log(`  ! ${name(r)}: ${e.message}`);
  else updated++;
}
console.log(`\nUpdated ${updated} rows.`);
