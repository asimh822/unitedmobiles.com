import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { startingPrice, type Product } from "@/lib/types";

/** Brand-row card: image, model name, price only — compact, half-size. */
export default function CompactProductCard({ product }: { product: Product }) {
  const { price, multiple } = startingPrice(product);
  const image = product.images[0];

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square bg-stone-50">
        {image ? (
          <Image
            src={image}
            alt={`${product.brand} ${product.model}`}
            fill
            sizes="(max-width: 640px) 20vw, (max-width: 1024px) 12vw, 7vw"
            className="object-contain p-1 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full place-items-center text-xl text-stone-300">📱</div>
        )}
      </div>
      <div className="px-1.5 pb-1.5 pt-1">
        <p className="truncate text-[10px] font-semibold leading-tight text-ink sm:text-[11px]">
          {product.model}
        </p>
        <p className="truncate text-[10px] font-bold text-brand sm:text-[11px]">
          {multiple && <span className="font-medium text-stone-400">from </span>}
          {formatPrice(price)}
        </p>
      </div>
    </Link>
  );
}
