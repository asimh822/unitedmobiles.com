import BrandRows from "@/components/BrandRows";
import Hero from "@/components/Hero";

// Homepage is the brand-browsing entry point: banner + brand rows of New
// Phones. Search/filter/sort live on brand and remaining grid pages.
export const revalidate = 300;

export default function HomePage() {
  return (
    <div className="space-y-3 pt-2">
      <Hero />
      <BrandRows category="New Phones" />
    </div>
  );
}
