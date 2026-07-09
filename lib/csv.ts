/** Minimal CSV parse/stringify — handles quotes, commas, CRLF, embedded newlines. */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(headers: string[], rows: (string | number | boolean | null)[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map((c) => escapeCell(c == null ? "" : String(c))).join(","));
  }
  return lines.join("\r\n");
}

/* ------------- flexible column mapping for desktop-exported CSVs ------------- */

export const IMPORT_FIELDS = [
  { key: "brand", label: "Brand", required: true },
  { key: "model", label: "Model", required: true },
  { key: "category", label: "Category", required: false },
  { key: "price", label: "Original Price", required: true },
  { key: "sale_price", label: "Sale Price", required: false },
  { key: "sale_active", label: "Sale Active (yes/no)", required: false },
  { key: "ram", label: "RAM", required: false },
  { key: "storage", label: "Storage", required: false },
  { key: "color", label: "Color / Variant", required: false },
  { key: "condition", label: "Condition (New/Used)", required: false },
  { key: "pta_approved", label: "PTA Approved (yes/no)", required: false },
  { key: "warranty", label: "Warranty", required: false },
  { key: "stock", label: "Stock Status", required: false },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

/** Synonyms seen in common desktop-app exports, matched case/punctuation-insensitively. */
const SYNONYMS: Record<ImportFieldKey, string[]> = {
  brand: ["brand", "make", "company", "manufacturer"],
  category: ["category", "cat", "producttype", "section", "department"],
  model: ["model", "name", "product", "productname", "title", "item", "phone"],
  price: ["price", "originalprice", "retailprice", "amount", "rate", "saleprice0", "mrp", "listprice"],
  sale_price: ["saleprice", "discountprice", "discountedprice", "offerprice", "specialprice"],
  sale_active: ["saleactive", "onsale", "sale", "discountactive"],
  ram: ["ram", "memory"],
  storage: ["storage", "rom", "capacity", "internalstorage", "internal"],
  color: ["color", "colour", "variant", "colorvariant"],
  condition: ["condition", "state", "newused", "type"],
  pta_approved: ["pta", "ptaapproved", "ptastatus", "approved"],
  warranty: ["warranty", "warrantyinfo", "guarantee"],
  stock: ["stock", "stockstatus", "instock", "availability", "available", "quantity", "qty"],
};

function normalize(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Best-effort auto-map of CSV headers to product fields; user can override in the UI. */
export function autoMapColumns(headers: string[]): Record<number, ImportFieldKey | ""> {
  const mapping: Record<number, ImportFieldKey | ""> = {};
  const used = new Set<ImportFieldKey>();
  headers.forEach((header, i) => {
    const n = normalize(header);
    let match: ImportFieldKey | "" = "";
    for (const field of IMPORT_FIELDS) {
      if (used.has(field.key)) continue;
      if (SYNONYMS[field.key].includes(n)) {
        match = field.key;
        break;
      }
    }
    if (match) used.add(match);
    mapping[i] = match;
  });
  return mapping;
}

export function parseBool(value: string): boolean {
  return ["yes", "y", "true", "1", "on", "approved"].includes(value.trim().toLowerCase());
}

export function parsePrice(value: string): number {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Desktop-catalog model names often embed the memory config: "A07 4+128",
 * "CAM50 8+", "Y21D 6GB", "A5 4+128MI". Split those into a clean base model
 * plus RAM/storage so configs merge into one product as variants.
 * Storage under 16GB (e.g. "4+2" = virtual-RAM notation) is NOT treated as a
 * config to avoid mislabeling.
 */
export function parseModelConfig(
  model: string,
): { base: string; ram: string | null; storage: string | null } | null {
  const trimmed = model.trim();

  const plus = trimmed.match(/^(.*\S)\s+(\d+)\s*\+\s*(\d+)?\s*[A-Za-z]*$/);
  if (plus) {
    const ram = Number(plus[2]);
    const rom = plus[3] ? Number(plus[3]) : null;
    if (rom !== null && rom < 16) return null; // "4+2" style virtual-RAM suffix
    return { base: plus[1].trim(), ram: `${ram}GB`, storage: rom ? `${rom}GB` : null };
  }

  const gb = trimmed.match(/^(.*\S)\s+(\d+)\s*GB$/i);
  if (gb) {
    return { base: gb[1].trim(), ram: `${Number(gb[2])}GB`, storage: null };
  }

  return null;
}
