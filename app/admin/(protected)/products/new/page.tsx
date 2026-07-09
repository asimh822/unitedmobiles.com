import ProductForm from "@/components/admin/ProductForm";
import { getBrands } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const brands = await getBrands();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-ink">Add Product</h2>
      <ProductForm brandNames={brands.map((b) => b.name)} />
    </div>
  );
}
