import type { Metadata } from "next";
import CatalogBrowser, { type SearchParams } from "@/components/CatalogBrowser";

export const metadata: Metadata = { title: "KeyPad Phones" };

export default async function KeypadPhonesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <CatalogBrowser
      title="KeyPad Phones"
      basePath="/keypad-phones"
      fixed={{ category: "KeyPad Phones" }}
      searchParams={await searchParams}
      showRamStorage={false}
      showCondition={false}
      dense
    />
  );
}
