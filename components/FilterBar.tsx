"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { FilterOptions } from "@/lib/types";

const PRICE_RANGES = [
  { label: "Any Price", value: "" },
  { label: "Under Rs. 50,000", value: "0-50000" },
  { label: "Rs. 50,000 – 100,000", value: "50000-100000" },
  { label: "Rs. 100,000 – 200,000", value: "100000-200000" },
  { label: "Rs. 200,000 – 350,000", value: "200000-350000" },
  { label: "Above Rs. 350,000", value: "350000-" },
];

const SORTS = [
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Newest", value: "newest" },
];

interface FilterBarProps {
  options: FilterOptions;
  /** Page the filters apply to, e.g. "/new-phones" or "/brand/vivo". */
  basePath?: string;
  /** Hide RAM/Storage filters on accessory pages. */
  showRamStorage?: boolean;
  /** Hide the condition filter where the category already implies it. */
  showCondition?: boolean;
  /** Hide the brand filter on brand pages. */
  showBrand?: boolean;
}

export default function FilterBar({
  options,
  basePath = "/",
  showRamStorage = true,
  showCondition = true,
  showBrand = true,
}: FilterBarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function apply(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page"); // any filter change resets pagination
    startTransition(() => {
      router.replace(next.size ? `${basePath}?${next.toString()}` : basePath, { scroll: false });
    });
  }

  function onSearchChange(value: string) {
    setSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => apply({ q: value.trim() }), 350);
  }

  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  const priceValue = `${params.get("min") ?? ""}-${params.get("max") ?? ""}`;
  const hasFilters = ["q", "brand", "min", "max", "ram", "storage", "condition", "sort"].some(
    (k) => params.get(k),
  );

  const selectClass =
    "rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-ink focus:border-brand focus:outline-none";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 stroke-stone-400"
          fill="none"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by brand or model — e.g. Samsung, iPhone 15…"
          className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm text-ink placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showBrand && (
          <select
            aria-label="Brand"
            className={selectClass}
            value={params.get("brand") ?? ""}
            onChange={(e) => apply({ brand: e.target.value })}
          >
            <option value="">All Brands</option>
            {options.brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}

        <select
          aria-label="Price range"
          className={selectClass}
          value={PRICE_RANGES.some((r) => r.value === priceValue.replace(/^-$/, "")) ? priceValue.replace(/^-$/, "") : ""}
          onChange={(e) => {
            const [min, max] = e.target.value.split("-");
            apply({ min: min ?? "", max: max ?? "" });
          }}
        >
          {PRICE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        {showRamStorage && (
          <>
            <select
              aria-label="RAM"
              className={selectClass}
              value={params.get("ram") ?? ""}
              onChange={(e) => apply({ ram: e.target.value })}
            >
              <option value="">Any RAM</option>
              {options.rams.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <select
              aria-label="Storage"
              className={selectClass}
              value={params.get("storage") ?? ""}
              onChange={(e) => apply({ storage: e.target.value })}
            >
              <option value="">Any Storage</option>
              {options.storages.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </>
        )}

        {showCondition && (
          <select
            aria-label="Condition"
            className={selectClass}
            value={params.get("condition") ?? ""}
            onChange={(e) => apply({ condition: e.target.value })}
          >
            <option value="">New & Used</option>
            <option value="New">New</option>
            <option value="Used">Used</option>
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                startTransition(() => router.replace(basePath, { scroll: false }));
              }}
              className="text-sm font-semibold text-turq-deep hover:underline"
            >
              Clear
            </button>
          )}
          <select
            aria-label="Sort"
            className={selectClass}
            value={params.get("sort") ?? "price_asc"}
            onChange={(e) => apply({ sort: e.target.value === "price_asc" ? "" : e.target.value })}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
