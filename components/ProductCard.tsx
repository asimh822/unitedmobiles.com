import Image from "next/image";
import Link from "next/link";
import PriceTag from "@/components/PriceTag";
import { formatGb, formatPrice } from "@/lib/format";
import { isOnSale, startingPrice, type Product } from "@/lib/types";

/**
 * Multiple variant prices -> "Starting from Rs. X" (lowest effective price);
 * a single price keeps the normal sale-aware PriceTag.
 */
function CardPrice({ product }: { product: Product }) {
  const { price, multiple } = startingPrice(product);
  if (!multiple) return <PriceTag product={product} />;
  return (
    <p className="text-base font-bold text-ink">
      <span className="block text-[11px] font-medium leading-tight text-stone-400">
        Starting from
      </span>
      {formatPrice(price)}
    </p>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const inStock = product.stockStatus === "in_stock";
  const image = product.images[0];

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition-shadow hover:shadow-lg"
    >
      <div className="tile-edge" />
      <div className="relative aspect-square bg-stone-100">
        {image ? (
          <Image
            src={image}
            alt={`${product.brand} ${product.model}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl text-stone-300">📱</div>
        )}
        {isOnSale(product) && (
          <span className="absolute left-3 top-3 rounded-full bg-gold-dark px-2.5 py-1 text-xs font-bold text-white">
            SALE
          </span>
        )}
        {product.condition === "Used" && (
          <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white">
            Used
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">{product.brand}</p>
        <h3 className="line-clamp-2 text-sm font-semibold text-ink sm:text-base">{product.model}</h3>
        {(product.ram || product.storage) && (
          <p className="text-xs text-stone-500">
            {[product.ram, product.storage].filter((v): v is string => Boolean(v)).map(formatGb).join(" · ")}
          </p>
        )}
        <div className="mt-auto pt-1">
          <CardPrice product={product} />
          <p
            className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${
              inStock ? "text-emerald-700" : "text-stone-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-emerald-500" : "bg-stone-400"}`}
            />
            {inStock ? "In Stock" : "Out of Stock"}
          </p>
        </div>
      </div>
    </Link>
  );
}
