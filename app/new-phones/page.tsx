import type { Metadata } from "next";
import CatalogBrowser, { type SearchParams } from "@/components/CatalogBrowser";

export const metadata: Metadata = { title: "New Phones" };

export default async function NewPhonesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <CatalogBrowser
      title="New Phones"
      basePath="/new-phones"
      fixed={{ category: "New Phones" }}
      searchParams={await searchParams}
      showCondition={false}
    />
  );
}
