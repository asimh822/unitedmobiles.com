// READ-ONLY. Reads the shop's desktop EPOS database (E:\ShopSoftware\united_mobile.db)
// and diffs its used-phone stock against the website's category='Used' products,
// then prints a review table and writes a plan file for scripts/apply-used-stock.mjs.
//
// Used stock in the EPOS is modelled as a fake brand named USED (brands.id = 19);
// its model names carry a one/two-letter real-brand prefix instead ("S A07" =
// Samsung Galaxy A07, "R C65 8+256" = Realme C65). Nothing here writes anywhere —
// the shop DB is opened read-only and the website DB is only SELECTed.
//
// Usage: node scripts/used-stock-review.mjs [--db=<path>] [--out=<plan.json>]
import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { serviceClient, fetchAll, norm, sameModel, titleCase, root } from "./priceoye-match.mjs";

const dbPath =
  (process.argv.find((a) => a.startsWith("--db=")) ?? "--db=E:/ShopSoftware/united_mobile.db").slice(5);
const outPath =
  (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6) || join(root, "scripts", "used-stock-plan.json");

/* ---------------------------- shop DB (read-only) ---------------------------- */

const db = new DatabaseSync(dbPath, { readOnly: true });
const shopRows = db
  .prepare(
    `SELECT m.id AS model_id, m.name AS name, m.reference_price AS ref_price,
            COUNT(*) AS units,
            MIN(s.purchase_price) AS min_cost, MAX(s.purchase_price) AS max_cost
       FROM stock_items s JOIN models m ON m.id = s.model_id
      WHERE m.brand_id = 19 AND s.status = 'in_stock'
      GROUP BY m.id ORDER BY m.name`,
  )
  .all();
db.close();

/* ------------------------- shop name -> brand + model ------------------------- */

// Prefix letters the shop uses in place of the real brand.
const PREFIX = {
  s: "SAMSUNG",
  o: "OPPO",
  0: "OPPO", // keypad typo for O
  i: "INFINIX",
  v: "VIVO",
  t: "TECNO",
  d: "DIGIT",
  rl: "REALME",
  h: "HONOR",
  n: "NOKIA",
  // "r" is ambiguous (Redmi vs Realme) and is resolved against the live catalog.
};
const AMBIGUOUS = { r: ["MI", "REALME"] };

// Series abbreviations the EPOS uses that norm() does not already expand.
// Each only fires when the abbreviation is immediately followed by the model
// number — otherwise "SPARK20" would expand its own "SP" into "Spark ARK20".
const SERIES_ABBR = [
  [/^nt\s*(?=\d)/i, "Note "],
  [/^sm\s*(?=\d)/i, "Smart "],
  [/^ht\s*(?=\d)/i, "Hot "],
  [/^sp\s*(?=\d)/i, "Spark "],
  [/^cam\s*(?=\d)/i, "Camon "],
  // full words the shop runs together with the number
  [/^(note|smart|hot|spark|camon|reno|redmi|cygnal)\s*(?=\d)/i, (m) => titleCase(m) + " "],
];

function expandSeries(s) {
  let out = s.trim();
  for (const [re, rep] of SERIES_ABBR) {
    out = out.replace(re, typeof rep === "function" ? (m) => rep(m.trim()) : rep);
  }
  // Tidy the shop's shouting: "A6 PRO" -> "A6 Pro", "50I" -> "50i".
  out = out
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => {
      if (/^\d+[a-z]$/i.test(w)) return w.toLowerCase(); // 50i, 17s
      if (/^\d/.test(w)) return w.toUpperCase(); // 40PRO+, 12C
      if (/^[A-Z]+$/.test(w) && w.length > 1) return titleCase(w.toLowerCase()); // PRO -> Pro
      return w;
    })
    .join(" ");
  return out.trim();
}

// A trailing bare "U" just marks the unit as used — never part of the model.
const stripUsedFlag = (s) => s.replace(/\s+U$/i, "").trim();

// Strip the config noise the shop bakes into the name: "8+256", "6GB".
function splitConfig(name) {
  let ram = null;
  let storage = null;
  let rest = name;
  const combo = rest.match(/(\d+)\s*\+\s*(\d+)/);
  if (combo) {
    ram = `${combo[1]}GB`;
    storage = `${combo[2]}GB`;
    rest = rest.replace(combo[0], " ");
  }
  const lone = rest.match(/\b(\d+)\s*gb\b/i);
  if (lone && !ram) {
    ram = `${lone[1]}GB`;
    rest = rest.replace(lone[0], " ");
  }
  return { ram, storage, rest: rest.replace(/\s+/g, " ").trim() };
}

function parseShopName(raw) {
  const { ram, storage, rest } = splitConfig(raw);
  const body = stripUsedFlag(rest);
  const m = body.match(/^([A-Za-z0]{1,2})\s+(.+)$/);
  if (!m) return { brand: null, model: expandSeries(body), ram, storage, ambiguous: null };
  const key = m[1].toLowerCase();
  const model = expandSeries(m[2]);
  if (PREFIX[key]) return { brand: PREFIX[key], model, ram, storage, ambiguous: null };
  if (AMBIGUOUS[key]) return { brand: null, model, ram, storage, ambiguous: AMBIGUOUS[key] };
  // No recognised prefix — the whole string is the model (e.g. "Y21D 6GB").
  return { brand: null, model: expandSeries(body), ram, storage, ambiguous: null };
}

/* ------------------------------ website catalog ------------------------------ */

const supabase = serviceClient();
const site = await fetchAll(() =>
  supabase.from("products").select("id, brand, model, category, price, images, stock_status").order("id"),
);
const siteUsed = site.filter((p) => p.category === "Used");

// Every brand+model in the whole catalog, used to resolve the ambiguous "R" prefix
// and to guess a brand when the shop name carries no prefix at all.
const catalogByBrand = new Map();
for (const p of site) {
  const b = p.brand.toUpperCase();
  if (!catalogByBrand.has(b)) catalogByBrand.set(b, []);
  catalogByBrand.get(b).push(p);
}
function resolveBrand(model, candidates) {
  const hits = candidates.filter((b) =>
    (catalogByBrand.get(b) ?? []).some((p) => sameModel(norm(p.model, b), norm(model, b))),
  );
  return hits.length === 1 ? hits[0] : null;
}

// The catalog already spells these models the way the shop wants them shown
// ("60X" not "60x", "Galaxy A07" not "A07", "Y17s" not "Y17S"). If the same
// phone is already listed under that brand, adopt its exact model string.
function canonicalModel(brand, model) {
  if (!brand) return model;
  const key = norm(model, brand);
  const hit = (catalogByBrand.get(brand) ?? []).find((p) => sameModel(norm(p.model, brand), key));
  return hit ? hit.model : model;
}

/* --------------------------------- the diff --------------------------------- */

const plan = [];
const matchedSiteIds = new Set();

for (const row of shopRows) {
  const p = parseShopName(row.name);
  let brand = p.brand;
  let note = "";
  if (!brand && p.ambiguous) {
    brand = resolveBrand(p.model, p.ambiguous);
    if (!brand) note = `CONFIRM BRAND (${p.ambiguous.join(" or ")})`;
  }
  if (!brand) note ||= "CONFIRM BRAND";
  p.model = canonicalModel(brand, p.model);

  // Match against what the site already lists as Used. Site models carry the
  // same "used" suffix and prefix noise the shop names do ("Galaxy A16 U",
  // "O 11F"), so both sides go through the same cleanup before norm().
  const siteKey = (s) => {
    const body = stripUsedFlag(splitConfig(s.model).rest);
    const m = body.match(/^([A-Za-z0]{1,2})\s+(.+)$/);
    return norm(m && (PREFIX[m[1].toLowerCase()] || AMBIGUOUS[m[1].toLowerCase()]) ? m[2] : body, s.brand);
  };
  const shopKey = norm(p.model, brand ?? "");

  let hit = null;
  if (brand) {
    hit = siteUsed.find(
      (s) => !matchedSiteIds.has(s.id) && s.brand.toUpperCase() === brand && sameModel(siteKey(s), shopKey),
    );
  }
  // Only when the brand is still unknown, widen to a model-only match — but keep
  // it inside the candidate brands, or "R A5" (Redmi/Realme) steals Oppo's A5.
  if (!hit && !brand) {
    const allowed = p.ambiguous ?? null;
    hit = siteUsed.find(
      (s) =>
        !matchedSiteIds.has(s.id) &&
        (!allowed || allowed.includes(s.brand.toUpperCase())) &&
        sameModel(siteKey(s), shopKey),
    );
  }
  if (hit) matchedSiteIds.add(hit.id);

  const refBelowCost = row.ref_price != null && row.ref_price < row.max_cost;
  if (refBelowCost) note = [note, "REF BELOW COST"].filter(Boolean).join("; ");

  plan.push({
    action: hit ? "update" : "create",
    shopModel: row.name,
    brand,
    model: p.model,
    ram: p.ram,
    storage: p.storage,
    units: row.units,
    minCost: row.min_cost,
    maxCost: row.max_cost,
    refPrice: row.ref_price,
    sitePrice: hit ? Number(hit.price) : null,
    productId: hit?.id ?? null,
    siteModel: hit ? `${hit.brand} ${hit.model}` : null,
    approvedPrice: null,
    note,
  });
}

for (const s of siteUsed) {
  if (matchedSiteIds.has(s.id)) continue;
  plan.push({
    action: "delete",
    shopModel: null,
    brand: s.brand,
    model: s.model,
    units: 0,
    sitePrice: Number(s.price),
    productId: s.id,
    images: (s.images ?? []).length,
    approvedPrice: null,
    note: "no longer in shop stock",
  });
}

/* --------------------------------- output --------------------------------- */

const money = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
const costRange = (r) => (r.minCost === r.maxCost ? money(r.minCost) : `${money(r.minCost)}–${money(r.maxCost)}`);

const live = plan.filter((r) => r.action !== "delete");
const gone = plan.filter((r) => r.action === "delete");

console.log(`\nShop stock: ${shopRows.length} models / ${shopRows.reduce((a, r) => a + r.units, 0)} units`);
console.log(`Site Used:  ${siteUsed.length} products\n`);
console.log("| # | Shop code | Proposed name | Qty | Cost | Ref | Site now | Action | Notes |");
console.log("|---|---|---|---|---|---|---|---|---|");
live.forEach((r, i) => {
  const name = r.brand ? `${r.brand} ${r.model}` : `?? ${r.model}`;
  console.log(
    `| ${i + 1} | \`${r.shopModel}\` | ${name} | ${r.units} | ${costRange(r)} | ${money(r.refPrice)} | ` +
      `${money(r.sitePrice)} | ${r.action} | ${r.note || ""} |`,
  );
});
console.log(`\nTo delete (${gone.length}) — on the site but no longer in shop stock:`);
for (const r of gone) console.log(`  ${r.brand} ${r.model} (Rs. ${money(r.sitePrice)}, ${r.images} images)`);

writeFileSync(outPath, JSON.stringify(plan, null, 1));
console.log(`\nplan -> ${outPath}`);
console.log("Fill in approvedPrice (and any blank brand) before running apply-used-stock.mjs.");
