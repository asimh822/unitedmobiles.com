import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: Awaited<ReturnType<typeof getAllProducts>> = [];
  try {
    products = await getAllProducts();
  } catch {
    // Catalog unavailable — still emit the homepage.
  }

  return [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    ...products.map((p) => ({
      url: `${SITE_URL}/products/${p.id}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
