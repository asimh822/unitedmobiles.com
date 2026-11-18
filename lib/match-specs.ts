/**
 * Numeric "match fields" for the Build Your Dream Phone page (/build).
 *
 * The catalog's spec groups are free text copied from PriceOye and maker
 * sites ("171.1mm (6.7\")", "8000mAh/31.36Wh(Typical) 7780mAh(rated)",
 * "50MP+ AI"), so this file turns them into numbers.
 *
 * Self-contained on purpose (no "@/" imports): scripts/parse-match-specs.mjs
 * imports it directly with Node's type stripping, and the /build loader uses
 * the same code as a fallback for rows whose migration-007 columns are empty
 * (every new EPOS used phone, until the script is run again).
 */

export interface MatchFields {
  screenIn: number | null;
  batteryMah: number | null;
  mainCamMp: number | null;
  lensCount: number | null;
  ramGb: number | null;
  storageGb: number | null;
}

interface SpecGroupLike {
  category: string;
  items: { label: string; value: string }[];
}

export interface ProductLike {
  brand: string;
  model: string;
  ram: string | null;
  storage: string | null;
  specs: SpecGroupLike[];
  variants: { ram: string | null; storage: string | null }[];
}

/* ------------------------------ parsers ------------------------------ */

const num = (s: string) => Number.parseFloat(s);

/** "6.78 inches", "171.1mm (6.7\")", "120Hz 6.75'' Display", "Main screen: 8.03″ ...". */
export function parseScreen(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw.replace(/[‑–]/g, "-");
  // A number with an inch marker wins ("17.35 cm (6.83 inches)" → 6.83).
  const marked = s.match(/(\d{1,2}(?:\.\d{1,3})?)\s*(?:-?\s*inch|in\b|"|''|″|”|“)/i);
  if (marked) {
    const v = num(marked[1]);
    if (v >= 1.5 && v <= 14) return v;
  }
  // Otherwise the first plausible phone size ("6.6 HD Big Screen", "6.88"),
  // whole numbers only and never a measurement ("159.3mm (6.3" → 6.3).
  for (const m of s.matchAll(/(?<![\d.])(\d{1,2}(?:\.\d{1,3})?)(?![\d.])(?!\s*(?:hz|mm|cm|k\b|%|mp|gb|nits))/gi)) {
    const v = num(m[1]);
    if (v >= 3.5 && v <= 9) return v;
  }
  // Only a diagonal in mm/cm ("169.1mm").
  const metric = s.match(/(\d{2,3}(?:\.\d+)?)\s*(mm|cm)\b/i);
  if (metric) {
    const v = num(metric[1]) / (metric[2].toLowerCase() === "cm" ? 2.54 : 25.4);
    if (v >= 3.5 && v <= 9) return Math.round(v * 100) / 100;
  }
  return null;
}

/** Largest mAh figure (typical beats rated): "6000mAh (typ)", "Li-Po 4400 mAh". */
export function parseBattery(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const vals = [...raw.matchAll(/(\d{3,5})\s*mah/gi)].map((m) => num(m[1])).filter((v) => v >= 500 && v <= 15000);
  if (vals.length) return Math.max(...vals);
  const bare = raw.match(/^\s*(\d{4,5})\s*$/);
  return bare ? num(bare[1]) : null;
}

/**
 * Rear camera → { mp: highest MP, lenses: count }.
 * "50.0 MP + 12.0 MP + 5.0 MP" → 50/3, "48 + 48 + 48 MP" → 48/3,
 * "50MP+ AI" → 50/2, "Ultra-wide: 8MP; ... Wide: 50MP; ... Telephoto: 50MP" → 50/3.
 */
export function parseCamera(raw: string | null | undefined): { mp: number | null; lenses: number | null } {
  if (!raw) return { mp: null, lenses: null };
  const s = raw.replace(/megapixels?/gi, "MP");
  const hasMp = /\d\s*MP/i.test(s);
  const mps: number[] = [];
  let lenses = 0;
  for (const seg of s.split("+")) {
    const tokens = [...seg.matchAll(/(\d+(?:\.\d+)?)\s*MP/gi)].map((m) => num(m[1]));
    const aux = /\b(ai|auxiliary|depth|macro|bokeh)\b/i.test(seg);
    if (tokens.length) {
      mps.push(...tokens);
      lenses += tokens.length;
      // "50 MP, f/1.8, (wide), PDAF Auxiliary lens" = main + an extra lens.
      if (aux && seg.search(/\b(ai|auxiliary|depth|macro|bokeh)\b/i) > seg.search(/MP/i)) lenses += 1;
    } else if (hasMp && /^\s*\d+(?:\.\d+)?\s*$/.test(seg)) {
      mps.push(num(seg));
      lenses += 1;
    } else if (aux) {
      lenses += 1;
    }
  }
  const real = mps.filter((v) => v > 0 && v <= 300);
  return {
    mp: real.length ? Math.max(...real) : null,
    lenses: lenses > 0 ? Math.min(lenses, 5) : null,
  };
}

/** "8GB", "8gb RAM", "12+12GB" (virtual RAM ignored), "4+4", "256gn", "1TB". MB → null. */
export function parseGb(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+(?:\.\d+)?)\s*(tb|gb|mb)?/i);
  if (!m) return null;
  const v = num(m[1]);
  const unit = (m[2] ?? raw.match(/(tb|gb|mb)/i)?.[1] ?? "gb").toLowerCase();
  if (unit === "mb") return null; // keypad phones
  const gb = unit === "tb" ? v * 1024 : v;
  return gb > 0 && gb <= 4096 ? gb : null;
}

/* --------------------------- spec lookup --------------------------- */

function findSpec(specs: SpecGroupLike[], groups: RegExp, labels: RegExp): string | null {
  for (const g of specs ?? []) {
    if (!groups.test(g.category)) continue;
    for (const i of g.items ?? []) if (labels.test(i.label) && i.value?.trim()) return i.value;
  }
  return null;
}

/** Parse one product. RAM/storage fall back from variants to the row to the spec sheet. */
export function parseMatchFields(p: ProductLike): MatchFields {
  const specs = p.specs ?? [];
  const cam = parseCamera(findSpec(specs, /camera/i, /^(back|rear|main)( camera)?$/i));
  const maxOf = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x != null);
    return v.length ? Math.max(...v) : null;
  };
  return {
    screenIn: parseScreen(findSpec(specs, /display/i, /^(screen )?size$/i)),
    batteryMah: parseBattery(findSpec(specs, /battery/i, /^(type|capacity)$/i)),
    mainCamMp: cam.mp,
    lensCount: cam.lenses,
    ramGb:
      maxOf(p.variants.map((v) => parseGb(v.ram))) ??
      parseGb(p.ram) ??
      parseGb(findSpec(specs, /memory/i, /^ram$/i)),
    storageGb:
      maxOf(p.variants.map((v) => parseGb(v.storage))) ??
      parseGb(p.storage) ??
      parseGb(findSpec(specs, /memory/i, /^(internal memory|storage|rom)$/i)),
  };
}

/* ---------------------- used → catalog model match ---------------------- */

const EXPANSIONS: [RegExp, string][] = [
  [/\bht\s?(\d)/g, "hot$1"],
  [/\bnt\s?(\d)/g, "note$1"],
  [/\bsm\s?(\d)/g, "smart$1"],
  [/\bsp\s?(\d|go\b)/g, "spark$1"],
  [/\bcam\s?(\d)/g, "camon$1"],
];

/** Same idea as scripts/priceoye-match.mjs norm(): drop brand/"galaxy"/4G/5G noise. */
export function normModel(model: string, brand: string): string {
  let s = ` ${model.toLowerCase()} `;
  for (const w of [brand.toLowerCase(), ...brand.toLowerCase().split(/\s+/), "galaxy", "nubia", "4g", "5g"]) {
    if (w) s = s.replaceAll(` ${w} `, " ");
  }
  for (const [re, rep] of EXPANSIONS) s = s.replace(re, rep);
  return s.replace(/\+/g, "plus").replace(/[^a-z0-9]/g, "");
}

const SERIES = ["note", "hot", "smart", "spark", "camon", "reno", "blade", "redmi", "galaxy", "pova", "pop", "iphone", "poco"];

const BRAND_ALIASES: Record<string, string> = { xiaomi: "mi", redmi: "mi", poco: "mi" };
const normBrand = (b: string) => BRAND_ALIASES[b.toLowerCase().trim()] ?? b.toLowerCase().trim();

/**
 * Find the catalog phone a used handset is a copy of, for its screen /
 * battery / camera. Brand must agree unless the EPOS filed it as OTHER.
 * Exact model only: "A5" must not borrow from "A55".
 */
export function findDonor<T extends { brand: string; model: string }>(used: { brand: string; model: string }, catalog: T[]): T | null {
  const b = normBrand(used.brand);
  const anyBrand = b === "other" || b === "used" || b === "";
  const key = normModel(used.model, used.brand);
  if (!key) return null;
  const brandOk = (c: T) => anyBrand || normBrand(c.brand) === b;
  return (
    catalog.find((c) => brandOk(c) && normModel(c.model, c.brand) === key) ??
    // "A5" vs "Redmi A5": the extra part may only be a series name.
    catalog.find((c) => {
      if (!brandOk(c)) return false;
      const k = normModel(c.model, c.brand);
      return k.endsWith(key) && SERIES.includes(k.slice(0, k.length - key.length));
    }) ??
    null
  );
}

/** Fields a phone needs to be matched at all: memory plus one of the "feel" specs. */
export function missingFields(f: MatchFields): string[] {
  const out: string[] = [];
  if (f.screenIn == null) out.push("screen");
  if (f.batteryMah == null) out.push("battery");
  if (f.mainCamMp == null) out.push("camera");
  if (f.ramGb == null) out.push("ram");
  if (f.storageGb == null) out.push("storage");
  return out;
}

/** A Pre-Owned handset may have no RAM/storage on file: it is still shown,
 *  with memory scored as unknown, rather than hidden from customers. */
export function isMatchable(f: MatchFields, memoryOptional = false): boolean {
  return (
    (memoryOptional || f.ramGb != null || f.storageGb != null) &&
    (f.screenIn != null || f.batteryMah != null || f.mainCamMp != null)
  );
}
