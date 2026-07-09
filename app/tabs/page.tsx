import type { Metadata } from "next";
import CatalogBrowser, { type SearchParams } from "@/components/CatalogBrowser";

export const metadata: Metadata = { title: "Tabs" };

export default async function TabsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <CatalogBrowser
      title="Tabs"
      basePath="/tabs"
      fixed={{ category: "Tabs" }}
      searchParams={await searchParams}
    />
  );
}
