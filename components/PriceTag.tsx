import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  /** Variant-resolved prices override the product-level ones when provided. */
  price?: number;
  salePrice?: number | null;
  size?: "sm" | "lg";
}

export default function PriceTag({ product, price, salePrice, size = "sm" }: Props) {
  const base = price ?? product.price;
  const sale = product.saleActive ? (salePrice ?? product.salePrice) : null;
  const onSale = sale != null && sale < base;
  const mainClass =
    size === "lg" ? "text-2xl sm:text-3xl font-extrabold" : "text-base font-bold";

  if (!onSale) {
    return <p className={`${mainClass} text-ink`}>{formatPrice(base)}</p>;
  }
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className={`${mainClass} text-gold-dark`}>{formatPrice(sale)}</span>
      <span className={`${size === "lg" ? "text-lg" : "text-sm"} text-stone-400 line-through`}>
        {formatPrice(base)}
      </span>
    </p>
  );
}
