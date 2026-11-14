import type { Metadata } from "next";
import CatalogBrowser, { type SearchParams } from "@/components/CatalogBrowser";

// "Pre-Owned" on the page, but keep "Used" in the search title: that is what
// people type into Google ("used mobile Multan").
export const metadata: Metadata = {
  title: "Pre-Owned (Used) Phones in Multan",
  description:
    "Pre-owned (used) mobile phones at United Mobiles, Multan — real photos of the exact phone, condition rated out of 10, warranty shown.",
};

export default async function UsedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <CatalogBrowser
      title="Pre-Owned Phones"
      basePath="/used"
      fixed={{ category: "Used" }}
      searchParams={await searchParams}
      showCondition={false}
      dense
    />
  );
}
