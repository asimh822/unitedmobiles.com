import Hero from "@/components/Hero";
import BrandRow from "@/components/BrandRow";
import EmptyState from "@/components/EmptyState";
import { getHomepageBrandRows } from "@/lib/catalog";

// Homepage is the brand-browsing entry point: banner + brand rows of New
// Phones. Search/filter/sort live on category and brand pages.
export const revalidate = 300;

export default async function HomePage() {
  const rows = await getHomepageBrandRows();

  return (
    <div className="space-y-6 pt-4">
      <Hero />
      {rows.length === 0 ? (
        <EmptyState
          title="Catalog is loading up"
          message="New phones will appear here as soon as they're added."
        />
      ) : (
        <div className="space-y-6">
          {rows.map((row) => (
            <BrandRow key={row.brand.name} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
