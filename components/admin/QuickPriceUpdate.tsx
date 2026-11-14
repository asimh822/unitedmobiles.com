"use client";

import { useMemo, useState, useTransition } from "react";
import { applyPriceUpdates, type BulkPriceResult } from "@/app/admin/actions";
import { formatGb, formatPrice } from "@/lib/format";
import {
  matchPriceLine,
  parsePriceLines,
  type PriceMatch,
  type ProductMatchInfo,
} from "@/lib/quick-text";

const PLACEHOLDER = `Y19s, 8/256, 43999, 41500
Vivo, Y29, 6/128, Rs. 52,999
A3x | 4/64 | 28500 | 26999`;

const STATUS_BADGE: Record<PriceMatch["status"], { label: string; className: string }> = {
  matched: { label: "Matched", className: "bg-emerald-100 text-emerald-700" },
  not_found: { label: "Not found", className: "bg-red-100 text-red-600" },
  multiple: { label: "Needs info", className: "bg-amber-100 text-amber-700" },
};

function money(n: number | null): string {
  return n === null ? "—" : formatPrice(n);
}

export default function QuickPriceUpdate({ products }: { products: ProductMatchInfo[] }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<PriceMatch[] | null>(null);
  const [result, setResult] = useState<BulkPriceResult | null>(null);
  const [pending, startTransition] = useTransition();
  const brandNames = useMemo(() => [...new Set(products.map((p) => p.brand))], [products]);

  const matchedRows = rows?.filter((r) => r.status === "matched") ?? [];

  function parse() {
    setResult(null);
    setRows(parsePriceLines(text, brandNames).map((line) => matchPriceLine(line, products)));
  }

  function apply() {
    startTransition(async () => {
      setResult(
        await applyPriceUpdates(
          matchedRows.map((r) => ({
            productId: r.product!.id,
            variantIds: r.variantIds,
            updateProductPrice: r.updateProductPrice,
            price: r.line.price!,
            salePrice: r.line.salePrice,
            label: `${r.product!.brand} ${r.product!.model}`,
          })),
        ),
      );
    });
  }

  return (
    <div className="max-w-4xl space-y-4">
      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-xs text-stone-500">
          One product per line, fields separated by comma or <span className="font-mono">|</span>{" "}
          in any order: Model, RAM/ROM (e.g. <span className="font-mono">8/256</span>), new price,
          optional new discounted price. Brand is optional — add it when the same model exists
          under two brands. Only prices are changed; nothing else is touched, and no products are
          created.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={PLACEHOLDER}
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 font-mono text-sm text-ink focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={parse}
          disabled={!text.trim() || pending}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Parse &amp; preview
        </button>
      </section>

      {rows && rows.length === 0 && (
        <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500">
          Nothing to parse — paste at least one line first.
        </p>
      )}

      {rows && rows.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-extrabold text-ink">
              Preview — {matchedRows.length} of {rows.length} line{rows.length > 1 ? "s" : ""} ready
            </h3>
            <p className="text-xs text-stone-400">Nothing is saved until you apply.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs font-bold uppercase tracking-wide text-stone-400">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">RAM/ROM</th>
                  <th className="py-2 pr-3">Current Price</th>
                  <th className="py-2 pr-3">Current Disc.</th>
                  <th className="py-2 pr-3">New Price</th>
                  <th className="py-2 pr-3">New Disc.</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const badge = STATUS_BADGE[r.status];
                  return (
                    <tr key={i} className="border-b border-stone-100 align-top">
                      <td className="py-2.5 pr-3 font-semibold text-ink">
                        {r.product ? `${r.product.brand} ${r.product.model}` : (
                          <span className="font-mono text-xs text-stone-400">{r.line.raw}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-stone-500">
                        {r.line.ram || r.line.storage
                          ? [r.line.ram, r.line.storage].filter(Boolean).map((x) => formatGb(x!)).join(" / ")
                          : "—"}
                      </td>
                      <td className="py-2.5 pr-3">{money(r.currentPrice)}</td>
                      <td className="py-2.5 pr-3">{money(r.currentSalePrice)}</td>
                      <td className="py-2.5 pr-3 font-bold text-ink">{money(r.line.price)}</td>
                      <td className="py-2.5 pr-3 font-bold text-gold-dark">
                        {r.line.salePrice === null && r.status === "matched" ? (
                          <span className="font-medium text-stone-400" title="No discounted price on this line — left unchanged">
                            unchanged
                          </span>
                        ) : (
                          money(r.line.salePrice)
                        )}
                      </td>
                      <td className="py-2.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}>
                          {badge.label}
                        </span>
                        {r.reason && <p className="mt-1 max-w-[26ch] text-xs text-stone-500">{r.reason}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {result ? (
            <div className="space-y-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
              <p>
                Updated {result.updated} · Skipped {rows.length - matchedRows.length} · Failed{" "}
                {result.failed}
              </p>
              {result.errors.map((e, i) => (
                <p key={i} className="font-medium text-red-600">
                  {e}
                </p>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={apply}
              disabled={matchedRows.length === 0 || pending}
              className="w-full rounded-2xl bg-brand px-6 py-4 text-base font-extrabold text-white hover:bg-brand-dark disabled:opacity-50 sm:w-auto sm:px-12"
            >
              {pending
                ? "Applying…"
                : `Apply ${matchedRows.length} Update${matchedRows.length === 1 ? "" : "s"}`}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
