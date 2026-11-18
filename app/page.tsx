import BrandRows from "@/components/BrandRows";
import BuildSlide from "@/components/BuildSlide";
import Hero from "@/components/Hero";
import HeroCarousel from "@/components/HeroCarousel";
import LaunchSlide from "@/components/LaunchSlide";
import UsedPromoSlide, { getUsedPromo } from "@/components/UsedPromoSlide";

// Homepage is the brand-browsing entry point: banner + brand rows of New
// Phones. Search/filter/sort live on brand and remaining grid pages.
export const revalidate = 300;

export default async function HomePage() {
  const usedPromo = await getUsedPromo();
  return (
    <div className="space-y-3 pt-2">
      <HeroCarousel>
        {/* Used goes first: it is the newest section and the slide the shop
            most wants seen. Left out entirely when there is no used stock. */}
        {usedPromo && <UsedPromoSlide {...usedPromo} />}
        <Hero />
        <LaunchSlide
          href="/products/82337702-6ceb-4d2e-a0d4-d75376d0eedb"
          name="vivo V80"
          price={190000}
          saleDate="2026-11-17"
          images={[
            { src: "/promo/v80-green.webp", alt: "vivo V80 in Green" },
            { src: "/promo/v80-grey.webp", alt: "vivo V80 in Grey" },
          ]}
        />
        <BuildSlide />
      </HeroCarousel>
      <BrandRows category="New Phones" />
    </div>
  );
}
