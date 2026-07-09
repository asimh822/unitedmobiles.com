import type { Metadata } from "next";
import CatalogBrowser, { type SearchParams } from "@/components/CatalogBrowser";

export const metadata: Metadata = { title: "Used Phones" };

export default async function UsedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <CatalogBrowser
      title="Used Phones"
      basePath="/used"
      fixed={{ category: "Used" }}
      searchParams={await searchParams}
      showCondition={false}
    />
  );
}
