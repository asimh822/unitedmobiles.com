import BrandRow from "@/components/BrandRow";
import EmptyState from "@/components/EmptyState";
import { getBrandRows } from "@/lib/catalog";
import { categorySlug, slugify, type Category } from "@/lib/categories";

/**
 * Brand-grouped browsing view (homepage layout): one BrandRow per brand,
 * 12 products max each, View All linking to the brand page scoped to this
 * category.
 */
export default async function BrandRows({ category }: { category: Category }) {
  const rows = await getBrandRows(category);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        message="Products will appear here as soon as they're added."
        actionLabel="Back to homepage"
        actionHref="/"
      />
    );
  }

  const catParam = category === "New Phones" ? "" : `?cat=${categorySlug(category)}`;

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <BrandRow
          key={row.brand.name}
          row={row}
          viewAllHref={`/brand/${slugify(row.brand.name)}${catParam}`}
        />
      ))}
    </div>
  );
}
