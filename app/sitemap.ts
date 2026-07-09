import type { MetadataRoute } from "next";
import { getAllProducts, getBrands } from "@/lib/catalog";
import { slugify } from "@/lib/categories";
import { SITE_URL } from "@/lib/site";

const CATEGORY_PATHS = ["/new-phones", "/used", "/keypad-phones", "/tabs", "/accessories"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: Awaited<ReturnType<typeof getAllProducts>> = [];
  let brands: Awaited<ReturnType<typeof getBrands>> = [];
  try {
    [products, brands] = await Promise.all([getAllProducts(), getBrands()]);
  } catch {
    // Catalog unavailable — still emit the homepage.
  }

  return [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    ...CATEGORY_PATHS.map((p) => ({
      url: `${SITE_URL}${p}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...brands.map((b) => ({
      url: `${SITE_URL}/brand/${slugify(b.name)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${SITE_URL}/products/${p.id}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
