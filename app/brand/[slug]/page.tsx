import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogBrowser, { type SearchParams } from "@/components/CatalogBrowser";
import { getBrands } from "@/lib/catalog";
import { slugify } from "@/lib/categories";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

async function brandFromSlug(slug: string): Promise<string | null> {
  const brands = await getBrands();
  return brands.find((b) => slugify(b.name) === slug)?.name ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = await brandFromSlug((await params).slug);
  return { title: brand ? `${brand} — New Phones` : "Brand" };
}

/** Brand page: the standard filterable grid scoped to that brand's New Phones. */
export default async function BrandPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const brand = await brandFromSlug(slug);
  if (!brand) notFound();

  return (
    <CatalogBrowser
      title={`${brand} — New Phones`}
      basePath={`/brand/${slug}`}
      fixed={{ category: "New Phones", brand }}
      searchParams={sp}
      showCondition={false}
    />
  );
}
