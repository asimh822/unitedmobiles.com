import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { startingPrice, type Product } from "@/lib/types";

/** Homepage brand-row card: image, model name, price only — no specs/badges. */
export default function CompactProductCard({ product }: { product: Product }) {
  const { price, multiple } = startingPrice(product);
  const image = product.images[0];

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square bg-stone-50">
        {image ? (
          <Image
            src={image}
            alt={`${product.brand} ${product.model}`}
            fill
            sizes="(max-width: 640px) 38vw, (max-width: 1024px) 22vw, 16vw"
            className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full place-items-center text-2xl text-stone-300">📱</div>
        )}
      </div>
      <div className="px-2 pb-2 pt-1.5">
        <p className="truncate text-xs font-semibold text-ink sm:text-[13px]">{product.model}</p>
        <p className="text-xs font-bold text-brand sm:text-[13px]">
          {multiple && <span className="font-medium text-stone-400">from </span>}
          {formatPrice(price)}
        </p>
      </div>
    </Link>
  );
}
