"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

interface Props {
  brands: string[];
  /** Result count, already worded server-side ("14 products match 'earbuds'"). */
  countLabel: string;
  /** Right-aligned toolbar action (the Add Product button). */
  action?: React.ReactNode;
  /** Server-rendered table + pagination — dimmed while a query is in flight. */
  children: React.ReactNode;
}

const selectClass =
  "rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-ink focus:border-brand focus:outline-none";

/**
 * Admin catalog toolbar: debounced search + compact filters, all kept in the
 * URL query string (bookmarkable, survives refresh). Navigation happens in a
 * transition so the table below dims instead of the page flashing.
 */
export default function ProductsToolbar({ brands, countLabel, action, children }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync from the URL (back/forward) — but never clobber active typing.
  const urlQ = sp.get("q") ?? "";
  useEffect(() => {
    if (document.activeElement !== searchRef.current) setQ(urlQ);
  }, [urlQ]);

  function apply(next: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // any change in search/filters restarts at page 1
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false }));
  }

  function onSearch(value: string) {
    setQ(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => apply({ q: value.trim() }), 300);
  }

  function clearSearch() {
    if (debounce.current) clearTimeout(debounce.current);
    setQ("");
    apply({ q: "" });
    searchRef.current?.focus();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 shrink-0 text-sm text-stone-500">{countLabel}</p>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search brand or model…"
            aria-label="Search products"
            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-3 pr-8 text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-ink"
            >
              ×
            </button>
          )}
        </div>

        <select
          aria-label="Filter by condition"
          value={sp.get("condition") ?? ""}
          onChange={(e) => apply({ condition: e.target.value })}
          className={selectClass}
        >
          <option value="">Any Condition</option>
          <option value="New">New</option>
          <option value="Used">Used</option>
        </select>

        <select
          aria-label="Filter by stock status"
          value={sp.get("stock") ?? ""}
          onChange={(e) => apply({ stock: e.target.value })}
          className={selectClass}
        >
          <option value="">Any Stock</option>
          <option value="in_stock">In Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        <select
          aria-label="Filter by brand"
          value={sp.get("brand") ?? ""}
          onChange={(e) => apply({ brand: e.target.value })}
          className={selectClass}
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        {pending && (
          <span
            aria-label="Loading results"
            className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-brand"
          />
        )}
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </div>

      <div aria-busy={pending} className={`transition-opacity ${pending ? "pointer-events-none opacity-50" : ""}`}>
        {children}
      </div>
    </div>
  );
}
