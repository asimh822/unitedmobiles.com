"use client";

import { useState } from "react";
import { importProducts, type ImportRow } from "@/app/admin/actions";
import {
  autoMapColumns,
  IMPORT_FIELDS,
  parseBool,
  parseCsv,
  parsePrice,
  type ImportFieldKey,
} from "@/lib/csv";

export default function CsvImport() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, ImportFieldKey | "">>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: string }>({});

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult({});
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) {
      setResult({ error: "CSV needs a header row plus at least one data row." });
      setHeaders([]);
      setRows([]);
      return;
    }
    setHeaders(parsed[0]);
    setRows(parsed.slice(1));
    setMapping(autoMapColumns(parsed[0]));
  }

  function col(key: ImportFieldKey): number {
    return Number(Object.entries(mapping).find(([, v]) => v === key)?.[0] ?? -1);
  }

  function buildRows(): ImportRow[] {
    const idx = Object.fromEntries(IMPORT_FIELDS.map((f) => [f.key, col(f.key)])) as Record<
      ImportFieldKey,
      number
    >;
    const cell = (row: string[], key: ImportFieldKey) =>
      idx[key] >= 0 ? (row[idx[key]] ?? "").trim() : "";

    return rows
      .map((row): ImportRow | null => {
        const brand = cell(row, "brand");
        const model = cell(row, "model");
        const price = parsePrice(cell(row, "price"));
        if (!brand || !model || price <= 0) return null;
        const category = cell(row, "category") || null;
        const salePriceRaw = cell(row, "sale_price");
        const salePrice = salePriceRaw ? parsePrice(salePriceRaw) : null;
        const saleActiveRaw = cell(row, "sale_active");
        const stockRaw = cell(row, "stock").toLowerCase();
        return {
          brand,
          model,
          category,
          price,
          sale_price: salePrice,
          sale_active: saleActiveRaw ? parseBool(saleActiveRaw) : Boolean(salePrice),
          ram: cell(row, "ram") || null,
          storage: cell(row, "storage") || null,
          color: cell(row, "color") || null,
          condition: cell(row, "condition").toLowerCase().startsWith("u") ? "Used" : "New",
          pta_approved: cell(row, "pta_approved") ? parseBool(cell(row, "pta_approved")) : true,
          warranty: cell(row, "warranty") || null,
          in_stock: stockRaw
            ? !["out", "outofstock", "out of stock", "no", "0", "false"].includes(stockRaw)
            : true,
        };
      })
      .filter((r): r is ImportRow => r !== null);
  }

  async function runImport() {
    const missing = IMPORT_FIELDS.filter((f) => f.required && col(f.key) < 0);
    if (missing.length) {
      setResult({ error: `Map these required columns first: ${missing.map((f) => f.label).join(", ")}` });
      return;
    }
    const data = buildRows();
    if (!data.length) {
      setResult({ error: "No valid rows found — check the Brand, Model and Price mappings." });
      return;
    }
    setBusy(true);
    setResult(await importProducts(data));
    setBusy(false);
  }

  const selectClass =
    "rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs font-medium focus:border-brand focus:outline-none";

  return (
    <div className="space-y-5">
      <label className="block w-fit cursor-pointer rounded-xl border-2 border-dashed border-stone-300 bg-white px-8 py-6 text-center text-sm font-semibold text-stone-500 hover:border-brand">
        Choose CSV file…
        <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
      </label>

      {headers.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs font-bold uppercase text-stone-500">
                  <th className="px-4 py-3">CSV Column</th>
                  <th className="px-4 py-3">Maps To</th>
                  <th className="px-4 py-3">Sample</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-ink">{h || `(column ${i + 1})`}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={mapping[i] ?? ""}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [i]: e.target.value as ImportFieldKey | "" }))
                        }
                        className={selectClass}
                      >
                        <option value="">— ignore —</option>
                        {IMPORT_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}{f.required ? " *" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="max-w-48 truncate px-4 py-2.5 text-stone-500">{rows[0]?.[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-stone-500">
            {rows.length} data rows detected. Preview of what will be imported:
          </p>
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-left font-bold uppercase text-stone-500">
                  <th className="px-3 py-2">Brand</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Color</th>
                  <th className="px-3 py-2">RAM/Storage</th>
                  <th className="px-3 py-2">Condition</th>
                </tr>
              </thead>
              <tbody>
                {buildRows().slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-stone-100 last:border-0">
                    <td className="px-3 py-2">{r.brand}</td>
                    <td className="px-3 py-2">{r.model}</td>
                    <td className="px-3 py-2">{r.price.toLocaleString("en-US")}</td>
                    <td className="px-3 py-2">{r.color ?? "—"}</td>
                    <td className="px-3 py-2">{[r.ram, r.storage].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="px-3 py-2">{r.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.error && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
              {result.error}
            </p>
          )}
          {result.success && (
            <p className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-brand">
              {result.success}
            </p>
          )}

          <button
            type="button"
            onClick={runImport}
            disabled={busy}
            className="rounded-2xl bg-coral px-8 py-3.5 text-base font-extrabold text-white hover:bg-coral-dark disabled:opacity-60"
          >
            {busy ? "Importing…" : `Import ${buildRows().length} rows`}
          </button>
        </>
      )}
    </div>
  );
}
