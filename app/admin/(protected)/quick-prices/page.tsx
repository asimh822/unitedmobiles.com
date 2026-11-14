import QuickPriceUpdate from "@/components/admin/QuickPriceUpdate";
import { getAllProducts } from "@/lib/catalog";
import type { ProductMatchInfo } from "@/lib/quick-text";

export const dynamic = "force-dynamic";

export default async function QuickPricesPage() {
  const products = await getAllProducts();
  // Slim matching index — the client only needs identity, config and prices.
  const index: ProductMatchInfo[] = products.map((p) => ({
    id: p.id,
    brand: p.brand,
    model: p.model,
    price: p.price,
    salePrice: p.salePrice,
    saleActive: p.saleActive,
    ram: p.ram,
    storage: p.storage,
    variants: p.variants.map((v) => ({
      id: v.id,
      ram: v.ram,
      storage: v.storage,
      price: v.price,
      salePrice: v.salePrice,
    })),
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-ink">Quick Update Prices</h2>
      <QuickPriceUpdate products={index} />
    </div>
  );
}
