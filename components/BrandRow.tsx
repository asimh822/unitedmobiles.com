import Link from "next/link";
import CompactProductCard from "@/components/CompactProductCard";
import { brandColor } from "@/lib/brand-colors";
import type { BrandRow as BrandRowData } from "@/lib/catalog";

interface Props {
  row: BrandRowData;
  /** Where the brand-name column and View All column link to. */
  viewAllHref: string;
}

/**
 * Brand block: [vertical brand name][2 rows of small cards][View All column].
 * The brand letters span from the middle of the first card row to the middle
 * of the second; the View All column mirrors the brand column, covering both
 * rows. On mobile the card grid scrolls horizontally between the two columns.
 */
export default function BrandRow({ row, viewAllHref }: Props) {
  const { brand, products } = row;
  const color = brandColor(brand.name);
  const letters = brand.name.replace(/\s/g, "").split("");

  return (
    <section aria-label={`${brand.name} products`} className="flex gap-1.5 sm:gap-2">
      <Link
        href={viewAllHref}
        className="flex shrink-0 items-center self-stretch rounded-lg border bg-white px-1.5 transition-opacity hover:opacity-75 sm:px-2"
        style={{ borderColor: `${color}44` }}
        title={`All ${brand.name} products`}
      >
        {/* h-1/2 + justify-between: first letter sits at ~25% and last at ~75%
            of the block height — mid of row one to mid of row two. */}
        <span
          className="flex h-1/2 min-h-16 flex-col items-center justify-between text-base font-extrabold uppercase leading-none sm:text-lg"
          style={{ color }}
          aria-label={brand.name}
        >
          {letters.map((ch, i) => (
            <span key={i} aria-hidden="true">{ch}</span>
          ))}
        </span>
      </Link>

      <div className="grid flex-1 auto-cols-[20%] grid-flow-col grid-rows-2 gap-1.5 overflow-x-auto pb-1 sm:auto-cols-[12%] lg:auto-cols-[calc((100%-7*0.375rem)/8)] lg:overflow-x-visible">
        {products.slice(0, 16).map((p) => (
          <CompactProductCard key={p.id} product={p} />
        ))}
      </div>

      <Link
        href={viewAllHref}
        className="flex shrink-0 items-center justify-center self-stretch rounded-lg border border-dashed bg-white px-1.5 transition-colors hover:bg-stone-50 sm:px-2"
        style={{ borderColor: `${color}66` }}
        title={`View all ${brand.name} products`}
      >
        <span
          className="text-[11px] font-bold uppercase tracking-[0.2em] [writing-mode:vertical-rl] sm:text-xs"
          style={{ color }}
        >
          View All
        </span>
      </Link>
    </section>
  );
}
