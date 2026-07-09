import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogBrowser, { type SearchParams } from "@/components/CatalogBrowser";
import {
  ACCESSORY_SUBCATEGORIES,
  SOUND_SUBCATEGORIES,
  slugify,
} from "@/lib/categories";

interface Props {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<SearchParams>;
}

/**
 * /accessories, /accessories/chargers, /accessories/sound,
 * /accessories/sound/headphones, ...
 */
function resolve(slug: string[] = []): { title: string; sub?: string; subSub?: string } | null {
  if (slug.length === 0) return { title: "Accessories" };
  const sub = ACCESSORY_SUBCATEGORIES.find((s) => slugify(s) === slug[0]);
  if (!sub) return null;
  if (slug.length === 1) return { title: sub, sub };
  if (sub !== "Sound" || slug.length > 2) return null;
  const subSub = SOUND_SUBCATEGORIES.find((s) => slugify(s) === slug[1]);
  if (!subSub) return null;
  return { title: subSub, sub, subSub };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = resolve((await params).slug);
  return { title: resolved ? `${resolved.title} — Accessories` : "Accessories" };
}

export default async function AccessoriesPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const resolved = resolve(slug);
  if (!resolved) notFound();

  const basePath = `/accessories${(slug ?? []).length ? `/${(slug ?? []).join("/")}` : ""}`;

  return (
    <CatalogBrowser
      title={resolved.title}
      basePath={basePath}
      fixed={{
        category: "Accessories",
        subcategory: resolved.sub,
        subSubcategory: resolved.subSub,
      }}
      searchParams={sp}
      showRamStorage={false}
      showCondition={false}
    />
  );
}
