/**
 * Parsers for the admin "Quick Text" tools — Quick Add (one product pasted
 * from a supplier message) and Quick Update Prices (bulk price lines).
 * Pure string/regex, no network. Extend the synonym tables to teach new labels.
 */

/* ------------------------------ shared helpers ------------------------------ */

function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** "Rs. 43,999/-" → 43999; null when the token isn't a plain price. */
function parsePriceToken(raw: string): number | null {
  const stripped = raw
    .trim()
    .replace(/^(?:rs\.?|pkr)\s*/i, "")
    .replace(/\/-$/, "")
    .replace(/[,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(stripped)) return null;
  const n = Number(stripped);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Digits-only comparison so "8GB", "8 GB" and "8" all match. */
function normGb(value: string | null): string {
  if (!value) return "";
  const m = value.match(/\d+(?:\.\d+)?/);
  return m ? m[0] : value.trim().toLowerCase();
}

function normModel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/* ------------------------------ 1) Quick Add ------------------------------ */

export interface QuickAddFields {
  brand?: string;
  model?: string;
  price?: number;
  /** Normalized like the form/DB expect, e.g. "8GB". */
  ram?: string;
  storage?: string;
  /** e.g. `6.68"` — goes into the Display > Size spec. */
  screenSize?: string;
  /** "4G" | "5G" — goes into the Connectivity > Network spec. */
  network?: string;
}

export type QuickAddFieldKey = keyof QuickAddFields;

export const QUICK_ADD_LABELS: { key: QuickAddFieldKey; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "model", label: "Model" },
  { key: "price", label: "Price" },
  { key: "ram", label: "RAM" },
  { key: "storage", label: "ROM" },
  { key: "screenSize", label: "Screen size" },
  { key: "network", label: "Network" },
];

/** Label spellings seen in supplier messages, matched case/punctuation-insensitively. */
const QUICK_ADD_SYNONYMS: Record<QuickAddFieldKey, string[]> = {
  brand: ["brand", "make", "company", "manufacturer"],
  model: ["model", "name", "phone", "product", "device", "set"],
  price: ["price", "rate", "amount", "rs", "pkr", "originalprice", "newprice"],
  ram: ["ram", "memory"],
  storage: ["rom", "storage", "internal", "internalstorage", "capacity"],
  screenSize: ["screen", "screensize", "display", "displaysize", "size", "lcd"],
  network: ["network", "connectivity", "net", "sim"],
};

const COMBINED_MEMORY_RE = /^(\d+)\s*(?:gb)?\s*[/+]\s*(\d+)\s*(gb|tb)?$/i;

function parseGbValue(raw: string): string | null {
  const tb = raw.match(/(\d+(?:\.\d+)?)\s*tb/i);
  if (tb) return `${tb[1]}TB`;
  const gb = raw.match(/(\d+(?:\.\d+)?)/);
  return gb ? `${gb[1]}GB` : null;
}

export interface QuickAddResult {
  fields: QuickAddFields;
  /** Human labels that matched with a usable value, e.g. ["Brand", "Price"]. */
  matched: string[];
  /** Labels from QUICK_ADD_LABELS that were NOT filled — left blank for manual entry. */
  missing: string[];
  /** Input lines that couldn't be understood (unknown label or unparseable value). */
  unrecognized: string[];
}

export function parseQuickAdd(text: string): QuickAddResult {
  const fields: QuickAddFields = {};
  const unrecognized: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // "Label: value", "Label = value" or "Label - value" (spaced dash only,
    // so model names like "Y19s-Pro" survive on the value side).
    const sep = line.match(/^([^:=]+?)\s*[:=]\s*(.+)$/) ?? line.match(/^(.+?)\s+[-–]\s+(.+)$/);
    if (!sep) {
      unrecognized.push(line);
      continue;
    }
    const key = QUICK_ADD_LABELS.find((f) =>
      QUICK_ADD_SYNONYMS[f.key].includes(normalizeLabel(sep[1])),
    )?.key;
    const value = sep[2].trim();
    if (!key || !value) {
      unrecognized.push(line);
      continue;
    }

    let ok = true;
    switch (key) {
      case "brand":
      case "model":
        fields[key] = value.replace(/\s+/g, " ");
        break;
      case "price": {
        const n = parsePriceToken(value);
        if (n !== null) fields.price = n;
        else ok = false;
        break;
      }
      case "ram":
      case "storage": {
        // "8/256" under a RAM or Memory label fills both fields at once.
        const combo = value.match(COMBINED_MEMORY_RE);
        if (combo) {
          fields.ram ??= `${combo[1]}GB`;
          fields.storage ??= `${combo[2]}${(combo[3] ?? "GB").toUpperCase()}`;
        } else {
          const gb = parseGbValue(value);
          if (gb) fields[key] = gb;
          else ok = false;
        }
        break;
      }
      case "screenSize": {
        const m = value.match(/(\d+(?:\.\d+)?)/);
        if (m) fields.screenSize = `${m[1]}"`;
        else ok = false;
        break;
      }
      case "network": {
        if (/5\s*g/i.test(value)) fields.network = "5G";
        else if (/4\s*g|lte/i.test(value)) fields.network = "4G";
        else ok = false;
        break;
      }
    }
    if (!ok) unrecognized.push(line);
  }

  const matched = QUICK_ADD_LABELS.filter((f) => fields[f.key] !== undefined).map((f) => f.label);
  const missing = QUICK_ADD_LABELS.filter((f) => fields[f.key] === undefined).map((f) => f.label);
  return { fields, matched, missing, unrecognized };
}

/* ------------------------- 2) Quick Update Prices ------------------------- */

export interface PriceLine {
  raw: string;
  brand: string | null;
  model: string | null;
  ram: string | null;
  storage: string | null;
  /** New original price. */
  price: number | null;
  /** New discounted price; null = leave the discounted price untouched. */
  salePrice: number | null;
  /** Set when the line couldn't be parsed; such lines are skipped, not saved. */
  error: string | null;
}

/** Model tokens like "Y19s 8/256" carry the config inline. */
const TRAILING_CONFIG_RE = /^(.*\S)\s+(\d+)\s*(?:gb)?\s*[/+]\s*(\d+)\s*(gb|tb)?$/i;

/**
 * One product update per line, fields separated by "," or "|" in any order:
 * optional Brand, Model, RAM/ROM ("6/128"), New Price, optional New Discounted.
 * Prices must be >= 1000 so model numbers ("13", "256") are never read as prices.
 */
export function parsePriceLines(text: string, knownBrands: string[]): PriceLine[] {
  const brandByNorm = new Map(knownBrands.map((b) => [b.trim().toLowerCase(), b]));
  const lines: PriceLine[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim();
    if (!raw) continue;

    // Remove thousands separators BEFORE splitting so "Rs. 43,999" doesn't
    // split into two tokens on a comma-separated line.
    const decommaed = raw.replace(/(?<=\d),(?=\d{3}\b)/g, "");
    const tokens = decommaed
      .split(decommaed.includes("|") ? "|" : ",")
      .map((t) => t.trim())
      .filter(Boolean);

    const line: PriceLine = {
      raw,
      brand: null,
      model: null,
      ram: null,
      storage: null,
      price: null,
      salePrice: null,
      error: null,
    };
    const prices: number[] = [];
    const modelParts: string[] = [];

    for (const token of tokens) {
      const combo = token.match(COMBINED_MEMORY_RE);
      if (combo && !line.ram) {
        line.ram = `${combo[1]}GB`;
        line.storage = `${combo[2]}${(combo[3] ?? "GB").toUpperCase()}`;
        continue;
      }
      const n = parsePriceToken(token);
      if (n !== null && n >= 1000) {
        prices.push(n);
        continue;
      }
      const brand = brandByNorm.get(token.toLowerCase());
      if (brand && !line.brand) {
        line.brand = brand;
        continue;
      }
      modelParts.push(token);
    }

    let model = modelParts.join(" ").replace(/\s+/g, " ").trim();
    if (model && !line.ram) {
      const inline = model.match(TRAILING_CONFIG_RE);
      if (inline) {
        model = inline[1].trim();
        line.ram = `${inline[2]}GB`;
        line.storage = `${inline[3]}${(inline[4] ?? "GB").toUpperCase()}`;
      }
    }
    line.model = model || null;

    if (!line.model) line.error = "No model name found";
    else if (prices.length === 0) line.error = "No new price found (prices must be Rs. 1,000+)";
    else if (prices.length > 2) line.error = "Too many prices — expected new price + optional discounted";
    else {
      // Order-insensitive: the higher number is the original, the lower the discount.
      line.price = Math.max(...prices);
      line.salePrice = prices.length === 2 ? Math.min(...prices) : null;
    }
    lines.push(line);
  }
  return lines;
}

/* ------------------------------ matching ------------------------------ */

/** Slim product index the quick-prices page builds server-side for matching. */
export interface ProductMatchInfo {
  id: string;
  brand: string;
  model: string;
  price: number;
  salePrice: number | null;
  saleActive: boolean;
  ram: string | null;
  storage: string | null;
  variants: {
    id: string;
    ram: string | null;
    storage: string | null;
    price: number | null;
    salePrice: number | null;
  }[];
}

export type MatchStatus = "matched" | "not_found" | "multiple";

export interface PriceMatch {
  line: PriceLine;
  status: MatchStatus;
  /** Why the line was skipped (parse error / no match / ambiguity). */
  reason: string | null;
  product: ProductMatchInfo | null;
  /** Variant rows to update when applied. */
  variantIds: string[];
  /** Also update the product-level price (no config variants, or base config matches). */
  updateProductPrice: boolean;
  currentPrice: number | null;
  currentSalePrice: number | null;
}

function skipped(line: PriceLine, status: MatchStatus, reason: string): PriceMatch {
  return {
    line,
    status,
    reason,
    product: null,
    variantIds: [],
    updateProductPrice: false,
    currentPrice: null,
    currentSalePrice: null,
  };
}

export function matchPriceLine(line: PriceLine, products: ProductMatchInfo[]): PriceMatch {
  if (line.error || !line.model) {
    return skipped(line, "not_found", line.error ?? "No model name found");
  }

  const model = normModel(line.model);
  let candidates = products.filter((p) => normModel(p.model) === model);
  if (line.brand) {
    candidates = candidates.filter((p) => p.brand.toLowerCase() === line.brand!.toLowerCase());
  }
  if (candidates.length === 0) {
    return skipped(
      line,
      "not_found",
      `No product named "${line.model}"${line.brand ? ` under ${line.brand}` : ""}`,
    );
  }
  const brands = [...new Set(candidates.map((p) => p.brand))];
  if (brands.length > 1) {
    return skipped(
      line,
      "multiple",
      `"${line.model}" exists under ${brands.join(" and ")} — add the brand to this line`,
    );
  }
  if (candidates.length > 1) {
    return skipped(
      line,
      "multiple",
      `${candidates.length} ${brands[0]} products share the model "${line.model}" — edit them individually`,
    );
  }

  const p = candidates[0];
  const configVariants = p.variants.filter((v) => v.ram || v.storage);
  const label = `${p.brand} ${p.model}`;

  if (line.ram || line.storage) {
    const vMatch = configVariants.filter(
      (v) => normGb(v.ram) === normGb(line.ram) && normGb(v.storage) === normGb(line.storage),
    );
    const baseMatches =
      normGb(p.ram) === normGb(line.ram) && normGb(p.storage) === normGb(line.storage);
    // With config variants, the variant rows are the source of truth; the
    // product-level price is only touched when it mirrors the same config.
    const updateProductPrice = configVariants.length === 0 ? baseMatches : vMatch.length > 0 && baseMatches;
    if (vMatch.length === 0 && !updateProductPrice) {
      return skipped(
        line,
        "not_found",
        `${label} has no ${normGb(line.ram) || "?"}/${normGb(line.storage) || "?"} option`,
      );
    }
    const v = vMatch[0];
    return {
      line,
      status: "matched",
      reason: null,
      product: p,
      variantIds: vMatch.map((x) => x.id),
      updateProductPrice,
      currentPrice: v ? (v.price ?? p.price) : p.price,
      currentSalePrice: v ? (v.salePrice ?? p.salePrice) : p.salePrice,
    };
  }

  if (configVariants.length > 0) {
    return skipped(
      line,
      "multiple",
      `${label} has ${configVariants.length} memory option${configVariants.length > 1 ? "s" : ""} — add RAM/ROM (e.g. 8/256) to this line`,
    );
  }
  return {
    line,
    status: "matched",
    reason: null,
    product: p,
    variantIds: [],
    updateProductPrice: true,
    currentPrice: p.price,
    currentSalePrice: p.salePrice,
  };
}
