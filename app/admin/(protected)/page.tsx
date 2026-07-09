import Link from "next/link";
import { getAllProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { isOnSale } from "@/lib/types";
import { deleteProduct } from "@/app/admin/actions";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ saved }, products] = await Promise.all([searchParams, getAllProducts()]);

  return (
    <div className="space-y-4">
      {saved && (
        <p className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-brand">
          Product saved.
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">{products.length} products in catalog</p>
        <Link
          href="/admin/products/new"
          className="rounded-xl bg-coral px-4 py-2.5 text-sm font-extrabold text-white hover:bg-coral-dark"
        >
          + Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="Catalog is empty"
          message="Add your first product or bulk-import your desktop CSV export."
          actionLabel="Import CSV"
          actionHref="/admin/import"
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs font-bold uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Sale</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {p.brand} {p.model}
                    <span className="block text-xs font-normal text-stone-400">
                      {[p.ram, p.storage].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3">
                    {isOnSale(p) ? (
                      <span className="font-bold text-coral">{formatPrice(p.salePrice!)}</span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.condition}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-bold ${
                        p.stockStatus === "in_stock" ? "text-emerald-600" : "text-stone-400"
                      }`}
                    >
                      {p.stockStatus === "in_stock" ? "In Stock" : "Out of Stock"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.variants.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        Edit
                      </Link>
                      <form action={deleteProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="font-semibold text-red-500 hover:underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
