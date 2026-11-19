import Image from "next/image";
import Link from "next/link";
import { formatGb, formatPrice } from "@/lib/format";
import { cardImage, formatConditionScore, startingPrice, type Product } from "@/lib/types";

/** Brand-row card: image, model name, price only — compact, half-size. */
export default function CompactProductCard({
  product,
  sizes = "(max-width: 640px) 20vw, (max-width: 1024px) 12vw, 7vw",
}: {
  product: Product;
  sizes?: string;
}) {
  const { price, multiple } = startingPrice(product);
  const image = cardImage(product);
  const used = product.condition === "Used";
  const score = used ? formatConditionScore(product.conditionScore) : null;
  // Storage only: there is room for one short value beside the score.
  const memory = used && product.storage ? formatGb(product.storage).toUpperCase() : "";

  return (
    <Link
      href={`/products/${product.id}`}
      className="card-lift group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white"
    >
      <div className="tile-edge" />
      <div className="relative aspect-square overflow-hidden bg-stone-50">
        {image ? (
          <Image
            src={image}
            alt={`${product.brand} ${product.model}`}
            fill
            sizes={sizes}
            className={`${used ? "object-cover" : "object-contain p-1"} transition-transform duration-300 group-hover:scale-[1.07]`}
          />
        ) : (
          <div className="grid h-full place-items-center text-xl text-stone-300">📱</div>
        )}
      </div>
      <div className="px-1.5 pb-1.5 pt-1">
        <p className="truncate text-[11px] font-semibold leading-tight text-ink sm:text-xs">
          {product.model}
        </p>
        {/* Pre-Owned: each card is one real handset, so say how good it is. */}
        {(score || memory) && (
          <p className="flex items-center gap-1 truncate text-[10px] font-bold leading-tight">
            {score && <span className="text-gold-dark">★ {score}</span>}
            {memory && <span className="truncate font-medium text-stone-500">{memory}</span>}
          </p>
        )}
        <p className="truncate text-[11px] font-extrabold text-brand sm:text-xs">
          {multiple && <span className="font-medium text-stone-500">from </span>}
          {formatPrice(price)}
        </p>
      </div>
    </Link>
  );
}
