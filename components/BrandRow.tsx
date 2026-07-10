import Link from "next/link";
import BrandCarousel from "@/components/BrandCarousel";
import CompactProductCard from "@/components/CompactProductCard";
import { KashiFlourish } from "@/components/KashiMotifs";
import { brandColor } from "@/lib/brand-colors";
import type { BrandRow as BrandRowData } from "@/lib/catalog";

interface Props {
  row: BrandRowData;
  /** Where the vertical brand-name column links to. */
  viewAllHref: string;
}

/**
 * Brand block: vertical brand name on the left (links to the brand page),
 * ONE row of small cards (8 visible on desktop) with ‹ › arrows paging
 * through the rest of that brand's models.
 */
export default function BrandRow({ row, viewAllHref }: Props) {
  const { brand, products } = row;
  const color = brandColor(brand.name);
  const letters = brand.name.replace(/\s/g, "").split("");

  return (
    <section aria-label={`${brand.name} products`} className="flex gap-1.5 sm:gap-2">
      {/* mb-1 mirrors the scroller's pb-1 so this box is exactly card height */}
      <Link
        href={viewAllHref}
        className="mb-1 flex shrink-0 items-center self-stretch rounded-lg border bg-white px-1.5 transition-opacity hover:opacity-75 sm:px-2"
        style={{ borderColor: `${color}44` }}
        title={`All ${brand.name} products`}
      >
        <span
          className={`flex flex-col items-center py-2 text-sm font-extrabold uppercase leading-none sm:text-base ${
            letters.length >= 4 ? "h-full justify-between" : "justify-center gap-2.5"
          }`}
          style={{ color }}
          aria-label={brand.name}
        >
          <KashiFlourish className="opacity-60" />
          {letters.map((ch, i) => (
            <span key={i} aria-hidden="true">{ch}</span>
          ))}
          <KashiFlourish className="opacity-60" />
        </span>
      </Link>

      <BrandCarousel color={color}>
        {products.slice(0, 24).map((p) => (
          <CompactProductCard key={p.id} product={p} />
        ))}
      </BrandCarousel>
    </section>
  );
}
