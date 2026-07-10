import { Suspense } from "react";
import CompactProductCard from "@/components/CompactProductCard";
import EmptyState from "@/components/EmptyState";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import ProductCard from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/Skeletons";
import { getFilterOptions, getProducts } from "@/lib/catalog";
import type { CatalogQuery, Condition, SortKey } from "@/lib/types";

export type SearchParams = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function toQuery(sp: SearchParams): CatalogQuery {
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

interface CatalogBrowserProps {
  title: string;
  basePath: string;
  /** Filters locked by the route (category/subcategory/brand). */
  fixed: Pick<CatalogQuery, "category" | "subcategory" | "subSubcategory" | "brand">;
  searchParams: SearchParams;
  showRamStorage?: boolean;
  showCondition?: boolean;
  /** Compact cards (no brand line), 8 per row on desktop — like the homepage brand rows. */
  dense?: boolean;
}

async function Grid({
  fixed,
  sp,
  basePath,
  dense,
}: {
  fixed: CatalogBrowserProps["fixed"];
  sp: SearchParams;
  basePath: string;
  dense?: boolean;
}) {
  // Dense pages fit 8 cards per row, so serve 5 full rows per page.
  const query = { ...toQuery(sp), ...fixed, ...(dense ? { perPage: 40 } : {}) };
  const { products, total, page, totalPages } = await getProducts(query);

  if (total === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        message="Try a different search or clear the filters — new stock arrives all the time."
        actionLabel="Clear filters"
        actionHref={basePath}
      />
    );
  }

  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) flat[k] = first(v);

  return (
    <>
      <p className="mb-3 text-sm text-stone-500">
        {total} product{total === 1 ? "" : "s"} available
      </p>
      {dense ? (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 sm:gap-2 lg:grid-cols-8">
          {products.map((p) => (
            <CompactProductCard
              key={p.id}
              product={p}
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 12vw"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} searchParams={flat} basePath={basePath} />
    </>
  );
}

/** Standard filterable product grid shared by category and brand pages. */
export default async function CatalogBrowser({
  title,
  basePath,
  fixed,
  searchParams,
  showRamStorage = true,
  showCondition = true,
  dense = false,
}: CatalogBrowserProps) {
  const options = await getFilterOptions(fixed);

  return (
    <div className="space-y-4 py-6">
      {/* sr-only: the nav already says where you are; keep the h1 for SEO/screen readers */}
      <h1 className="sr-only">{title}</h1>
      <Suspense fallback={null}>
        <FilterBar
          options={options}
          basePath={basePath}
          showRamStorage={showRamStorage}
          showCondition={showCondition}
          showBrand={!fixed.brand}
        />
      </Suspense>
      <Suspense fallback={<ProductGridSkeleton dense={dense} />}>
        <Grid fixed={fixed} sp={searchParams} basePath={basePath} dense={dense} />
      </Suspense>
    </div>
  );
}
