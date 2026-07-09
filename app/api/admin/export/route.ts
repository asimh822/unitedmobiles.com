import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAllProducts } from "@/lib/catalog";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** CSV export of the live catalog — one row per variant (or per product if none). */
export async function GET(): Promise<Response> {
  if (!(await isAdminAuthenticated())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const products = await getAllProducts();
  const headers = [
    "Brand", "Model", "Price", "Sale Price", "Sale Active", "RAM", "Storage",
    "Color", "Condition", "PTA Approved", "Warranty", "Stock Status", "Images",
  ];

  const rows: (string | number | boolean | null)[][] = [];
  for (const p of products) {
    const base = (color: string | null, ram: string | null, storage: string | null, price: number, sale: number | null, inStock: boolean) => [
      p.brand,
      p.model,
      price,
      sale,
      p.saleActive ? "yes" : "no",
      ram,
      storage,
      color,
      p.condition,
      p.ptaApproved ? "yes" : "no",
      p.warranty,
      inStock ? "In Stock" : "Out of Stock",
      p.images.join(" | "),
    ];
    if (p.variants.length === 0) {
      rows.push(base(null, p.ram, p.storage, p.price, p.salePrice, p.stockStatus === "in_stock"));
    } else {
      for (const v of p.variants) {
        rows.push(
          base(
            v.color,
            v.ram ?? p.ram,
            v.storage ?? p.storage,
            v.price ?? p.price,
            v.salePrice ?? p.salePrice,
            p.stockStatus === "in_stock" && v.inStock,
          ),
        );
      }
    }
  }

  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="united-mobiles-catalog-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
