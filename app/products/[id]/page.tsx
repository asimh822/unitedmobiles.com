import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import { getAllProducts, getProduct, getSimilarProducts, getSuggestedProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { effectivePrice } from "@/lib/types";

// ISR: product pages are static and refresh every 5 minutes.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const products = await getAllProducts();
    return products.map((p) => ({ id: p.id }));
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const title = `${product.brand} ${product.model} — ${formatPrice(effectivePrice(product))}`;
  const description = `Buy the ${product.brand} ${product.model} (${[product.ram, product.storage]
    .filter(Boolean)
    .join(", ")}) for ${formatPrice(effectivePrice(product))} at United Mobiles. ${
    product.ptaApproved ? "PTA approved. " : ""
  }Cash on delivery.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  // Admin-picked or automatic accessory suggestions; Similar Phones only
  // remains as the fallback when there's nothing to suggest.
  const suggested = await getSuggestedProducts(product);
  const related = suggested.length > 0 ? suggested : await getSimilarProducts(product);
  const heading = suggested.length > 0 ? "Goes With This Device" : "Similar Phones";

  return (
    <div className="space-y-10 py-6">
      <ProductPurchasePanel product={product} />

      {related.length > 0 && (
        <section aria-label={heading}>
          <h2 className="mb-4 text-xl font-extrabold text-ink">{heading}</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
