import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

interface Props {
  /** Product detail page this slide sells. */
  href: string;
  /** 1152x360 desktop crop under /public/promo. */
  src: string;
  /** 780x416 crop for narrow screens — the wide one loses the product at 375px. */
  narrowSrc: string;
  name: string;
  price: number;
  /** Shown when the model has cheaper variants, matching the product cards. */
  from?: boolean;
  alt: string;
}

/**
 * One promo slide: the manufacturer's key visual, full-bleed, with a shop bar
 * across the bottom carrying the model and price. The bar sits below the
 * product in both key visuals, so it never covers the phone itself.
 */
export default function PromoSlide({ href, src, narrowSrc, name, price, from = false, alt }: Props) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-3xl bg-stone-100 sm:h-[28vh]"
    >
      <picture>
        <source media="(min-width: 640px)" srcSet={src} />
        <Image
          src={narrowSrc}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 1152px"
          className="object-cover object-center"
        />
      </picture>

      <div className="relative flex items-center justify-between gap-3 bg-ink/75 px-4 py-2.5 text-white backdrop-blur-sm sm:px-6">
        <p className="min-w-0 truncate text-sm font-bold sm:text-base">
          {name}
          <span className="ml-2 font-semibold text-gold-light">
            {from ? "From " : ""}
            {formatPrice(price)}
          </span>
        </p>
        <span className="shrink-0 rounded-full bg-brand px-3 py-1 text-xs font-bold transition group-hover:bg-brand-dark sm:text-sm">
          Buy Now →
        </span>
      </div>
    </Link>
  );
}
