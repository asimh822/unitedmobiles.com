import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogBrowser, { type SearchParams } from "@/components/CatalogBrowser";
import { getBrands } from "@/lib/catalog";
import { CATEGORY_SLUGS, isPhoneLike, slugify, type Category } from "@/lib/categories";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

async function brandFromSlug(slug: string): Promise<string | null> {
  const brands = await getBrands();
  return brands.find((b) => slugify(b.name) === slug)?.name ?? null;
}

/** ?cat=used etc. scopes the brand page to another category (default New Phones). */
function categoryFromParams(sp: SearchParams): Category {
  const cat = Array.isArray(sp.cat) ? sp.cat[0] : sp.cat;
  return (cat && CATEGORY_SLUGS[cat]) || "New Phones";
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [brand, sp] = await Promise.all([brandFromSlug((await params).slug), searchParams]);
  return { title: brand ? `${brand} — ${categoryFromParams(sp)}` : "Brand" };
}

/** Brand page: the standard filterable grid scoped to that brand + category. */
export default async function BrandPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const brand = await brandFromSlug(slug);
  if (!brand) notFound();

  const category = categoryFromParams(sp);

  return (
    <CatalogBrowser
      title={`${brand} — ${category}`}
      basePath={`/brand/${slug}`}
      fixed={{ category, brand }}
      searchParams={sp}
      showRamStorage={isPhoneLike(category)}
      showCondition={false}
    />
  );
}
