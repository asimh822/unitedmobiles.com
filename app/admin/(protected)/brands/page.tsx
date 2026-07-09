import BrandManager from "@/components/admin/BrandManager";
import { getBrands } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
  const brands = await getBrands();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-ink">Brands</h2>
      <p className="max-w-2xl text-sm text-stone-500">
        Display order controls the sequence of brand rows on the homepage (lower numbers first).
        Logo URL is optional.
      </p>
      <BrandManager brands={brands} />
    </div>
  );
}
