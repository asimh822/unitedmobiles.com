import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { getBrands, getProduct } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, brands] = await Promise.all([getProduct(id), getBrands()]);
  if (!product) notFound();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-ink">
        Edit — {product.brand} {product.model}
      </h2>
      <ProductForm product={product} brandNames={brands.map((b) => b.name)} />
    </div>
  );
}
