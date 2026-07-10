import Link from "next/link";
import { getBrands, getProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { isOnSale, type Condition, type StockStatus } from "@/lib/types";
import { deleteProduct } from "@/app/admin/actions";
import EmptyState from "@/components/EmptyState";
import Pagination from "@/components/Pagination";
import ProductsToolbar from "@/components/admin/ProductsToolbar";

export const dynamic = "force-dynamic";

const PER_PAGE = 50;

interface AdminSearchParams {
  saved?: string;
  q?: string;
  brand?: string;
  condition?: string;
  stock?: string;
  page?: string;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const sp = await searchParams;
  const { saved } = sp;

  const q = sp.q?.trim() || undefined;
  const brand = sp.brand || undefined;
  const condition =
    sp.condition === "New" || sp.condition === "Used" ? (sp.condition as Condition) : undefined;
  const stock =
    sp.stock === "in_stock" || sp.stock === "out_of_stock"
      ? (sp.stock as StockStatus)
      : undefined;
  const pageNum = Math.max(1, Number(sp.page) || 1);
  const filtered = Boolean(q || brand || condition || stock);

  const [{ products, total, page, totalPages }, brands] = await Promise.all([
    getProducts({ q, brand, condition, stock, page: pageNum, perPage: PER_PAGE, sort: "newest" }),
    getBrands(),
  ]);

  const countLabel = q
    ? `${total} product${total === 1 ? "" : "s"} match “${q}”`
    : filtered
      ? `${total} product${total === 1 ? "" : "s"} match`
      : `${total} products in catalog`;

  return (
    <div className="space-y-4">
      {saved && (
        <p className="rounded-xl border border-brand/25 bg-brand/5 p-3 text-sm font-semibold text-brand">
          Product saved.
        </p>
      )}

      <ProductsToolbar
        brands={brands.map((b) => b.name)}
        countLabel={countLabel}
        action={
          <Link
            href="/admin/products/new"
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark"
          >
            + Add Product
          </Link>
        }
      >
        {total === 0 ? (
          filtered ? (
            <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">
              No products match — try different search text or clear the filters.
            </p>
          ) : (
            <EmptyState
              title="Catalog is empty"
              message="Add your first product or bulk-import your desktop CSV export."
              actionLabel="Import CSV"
              actionHref="/admin/import"
            />
          )
        ) : (
          <>
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
                          <span className="font-bold text-gold-dark">{formatPrice(p.salePrice!)}</span>
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
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath="/admin"
              searchParams={{ q, brand, condition, stock }}
            />
          </>
        )}
      </ProductsToolbar>
    </div>
  );
}
