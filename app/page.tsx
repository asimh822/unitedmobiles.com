import BrandRows from "@/components/BrandRows";
import Hero from "@/components/Hero";
import HeroCarousel from "@/components/HeroCarousel";
import PromoSlide from "@/components/PromoSlide";

// Homepage is the brand-browsing entry point: banner + brand rows of New
// Phones. Search/filter/sort live on brand and remaining grid pages.
export const revalidate = 300;

export default function HomePage() {
  return (
    <div className="space-y-3 pt-2">
      <HeroCarousel>
        <Hero />
        <PromoSlide
          href="/products/8fd5c802-6ceb-4778-af75-5cabdada990e"
          src="/promo/v80-lite.webp"
          narrowSrc="/promo/v80-lite-narrow.webp"
          name="vivo V80 Lite 5G"
          price={114999}
          from
          alt="vivo V80 Lite 5G in Silk White and Sapphire Blue"
        />
        <PromoSlide
          href="/products/78c5e0dd-d566-40a5-9e07-6b20d81520ac"
          src="/promo/reno16.webp"
          narrowSrc="/promo/reno16-narrow.webp"
          name="OPPO Reno16 5G"
          price={200999}
          alt="OPPO Reno16 5G in Pop White and Twilight Violet"
        />
      </HeroCarousel>
      <BrandRows category="New Phones" />
    </div>
  );
}
