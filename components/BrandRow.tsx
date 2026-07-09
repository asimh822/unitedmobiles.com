import Link from "next/link";
import CompactProductCard from "@/components/CompactProductCard";
import { brandColor } from "@/lib/brand-colors";
import type { BrandRow as BrandRowData } from "@/lib/catalog";

interface Props {
  row: BrandRowData;
  /** Where "View All" (and the vertical label) link to. */
  viewAllHref: string;
}

/**
 * Brand block: vertical brand name (official brand color) spanning both rows,
 * half-size compact cards in a 2-row grid, capped at 12 + a View All tile.
 * On mobile the grid scrolls horizontally instead of stacking.
 */
export default function BrandRow({ row, viewAllHref }: Props) {
  const { brand, products } = row;
  const color = brandColor(brand.name);
  return (
    <section aria-label={`${brand.name} products`} className="flex gap-2">
      <Link
        href={viewAllHref}
        className="flex shrink-0 items-stretch justify-center self-stretch rounded-lg border bg-white px-1 transition-opacity hover:opacity-75 sm:px-1.5"
        style={{ borderColor: `${color}44` }}
        title={`All ${brand.name} products`}
      >
        <span
          className="flex items-center text-xs font-extrabold uppercase tracking-[0.18em] [writing-mode:vertical-rl] sm:text-sm"
          style={{ color }}
        >
          {brand.name}
        </span>
      </Link>
      <div className="grid flex-1 auto-cols-[22%] grid-flow-col grid-rows-2 gap-1.5 overflow-x-auto pb-1 sm:auto-cols-[13%] lg:auto-cols-[calc((100%-7*0.375rem)/8)] lg:overflow-x-visible">
        {products.slice(0, 12).map((p) => (
          <CompactProductCard key={p.id} product={p} />
        ))}
        <Link
          href={viewAllHref}
          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-white text-center transition-colors hover:bg-stone-50"
          style={{ borderColor: `${color}66` }}
        >
          <span className="text-[11px] font-bold sm:text-xs" style={{ color }}>
            View All
          </span>
          <span className="text-sm" style={{ color }} aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
