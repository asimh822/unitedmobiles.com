import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CheckoutFlow from "@/components/CheckoutFlow";
import { getProduct, getSuggestedProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variant?: string }>;
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const [{ id }, { variant: variantId }] = await Promise.all([params, searchParams]);
  const product = await getProduct(id);
  if (!product || product.stockStatus === "out_of_stock") notFound();

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0] ?? null;
  // Same "Goes with this device" picks, offered as one-tap add-ons on review.
  const addons = await getSuggestedProducts(product);

  return (
    <div className="py-6">
      <Link
        href={`/products/${product.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
      >
        ‹ Back to {product.brand} {product.model}
      </Link>
      <h1 className="mb-5 text-2xl font-extrabold text-ink">Checkout</h1>
      <CheckoutFlow product={product} variant={variant} addons={addons} />
    </div>
  );
}
