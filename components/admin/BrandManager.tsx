"use client";

import { useState } from "react";
import { deleteBrand, saveBrands, type BrandInput } from "@/app/admin/actions";
import type { Brand } from "@/lib/types";

export default function BrandManager({ brands }: { brands: Brand[] }) {
  const [rows, setRows] = useState<BrandInput[]>(
    brands.map((b) => ({ id: b.id, name: b.name, logo: b.logo, displayOrder: b.displayOrder })),
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: string }>({});

  function update(i: number, patch: Partial<BrandInput>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    setBusy(true);
    setResult(await saveBrands(rows));
    setBusy(false);
  }

  const inputClass =
    "w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs font-bold uppercase text-stone-500">
              <th className="px-4 py-3 w-20">Order</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Logo URL (optional)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {[...rows]
              .map((r, i) => [r, i] as const)
              .sort((a, b) => a[0].displayOrder - b[0].displayOrder)
              .map(([row, i]) => (
                <tr key={row.id ?? `new-${i}`} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={row.displayOrder}
                      onChange={(e) => update(i, { displayOrder: Number(e.target.value) || 0 })}
                      className={`${inputClass} w-20`}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={row.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      className={inputClass}
                      placeholder="Brand name"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={row.logo ?? ""}
                      onChange={(e) => update(i, { logo: e.target.value })}
                      className={inputClass}
                      placeholder="https://…"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {row.id ? (
                      <form action={deleteBrand}>
                        <input type="hidden" name="id" value={row.id} />
                        <button type="submit" className="text-sm font-semibold text-red-500 hover:underline">
                          Delete
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                        className="text-sm font-semibold text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {result.error && <p className="text-sm font-semibold text-red-600">{result.error}</p>}
      {result.success && <p className="text-sm font-semibold text-brand">{result.success}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              { name: "", logo: null, displayOrder: (Math.max(0, ...prev.map((r) => r.displayOrder)) || 0) + 10 },
            ])
          }
          className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-ink hover:border-stone-400"
        >
          + Add Brand
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-xl bg-brand px-6 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save All"}
        </button>
      </div>
    </div>
  );
}
