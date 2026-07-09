import { Suspense } from "react";
import FilterBar from "@/components/FilterBar";
import Hero from "@/components/Hero";
import Pagination from "@/components/Pagination";
import ProductCard from "@/components/ProductCard";
import EmptyState from "@/components/EmptyState";
import { ProductGridSkeleton } from "@/components/Skeletons";
import { getFilterOptions, getProducts } from "@/lib/catalog";
import type { CatalogQuery, Condition, SortKey } from "@/lib/types";

// Re-generate at most every 5 minutes (ISR); filtered views render on demand.
export const revalidate = 300;

type SearchParams = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function toQuery(sp: SearchParams): CatalogQuery {
  const num = (v?: string) => {
    const n = Number(v);
    return v !== undefined && v !== "" && Number.isFinite(n) ? n : undefined;
  };
  const sort = first(sp.sort);
  const condition = first(sp.condition);
  return {
    q: first(sp.q) || undefined,
    brand: first(sp.brand) || undefined,
    minPrice: num(first(sp.min)),
    maxPrice: num(first(sp.max)),
    ram: first(sp.ram) || undefined,
    storage: first(sp.storage) || undefined,
    condition: condition === "New" || condition === "Used" ? (condition as Condition) : undefined,
    sort: sort === "price_asc" || sort === "price_desc" ? (sort as SortKey) : "newest",
    page: num(first(sp.page)) ?? 1,
  };
}

async function ProductGrid({ sp }: { sp: SearchParams }) {
  const query = toQuery(sp);
  const { products, total, page, totalPages } = await getProducts(query);

  if (total === 0) {
    return (
      <EmptyState
        title="No phones found"
        message="Try a different search or clear the filters — new stock arrives all the time."
        actionLabel="Clear filters"
        actionHref="/"
      />
    );
  }

  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) flat[k] = first(v);

  return (
    <>
      <p className="mb-3 text-sm text-stone-500">
        {total} phone{total === 1 ? "" : "s"} available
      </p>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} searchParams={flat} />
    </>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const options = await getFilterOptions();

  return (
    <div className="space-y-6 pt-4">
      <Hero />
      <section aria-label="Browse phones" className="space-y-4">
        <Suspense fallback={null}>
          <FilterBar options={options} />
        </Suspense>
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid sp={sp} />
        </Suspense>
      </section>
    </div>
  );
}
