import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-ink">Add Product</h2>
      <ProductForm />
    </div>
  );
}
