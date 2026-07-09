import Link from "next/link";
import CompactProductCard from "@/components/CompactProductCard";
import { slugify } from "@/lib/categories";
import type { BrandRow as BrandRowData } from "@/lib/catalog";

/**
 * Homepage brand block: vertical rotated brand name on the left (links to the
 * brand page), 6x2 compact cards on desktop. On mobile the same 2-row grid
 * scrolls horizontally (~2.5 cards visible) instead of stacking 12 cards tall.
 */
export default function BrandRow({ row }: { row: BrandRowData }) {
  const { brand, products } = row;
  return (
    <section aria-label={`${brand.name} phones`} className="flex gap-2 sm:gap-3">
      <Link
        href={`/brand/${slugify(brand.name)}`}
        className="flex shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 px-1.5 transition-colors hover:bg-brand hover:text-white sm:px-2.5"
        title={`All ${brand.name} phones`}
      >
        <span className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand [writing-mode:vertical-rl] hover:text-inherit sm:text-base">
          {brand.name}
        </span>
      </Link>
      <div className="grid flex-1 auto-cols-[38%] grid-flow-col grid-rows-2 gap-2 overflow-x-auto pb-1 sm:auto-cols-[23%] lg:auto-cols-[calc((100%-5*0.5rem)/6)] lg:overflow-x-visible">
        {products.slice(0, 12).map((p) => (
          <CompactProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
