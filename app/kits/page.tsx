import type { Metadata } from "next";
import CatalogBrowser, { type SearchParams } from "@/components/CatalogBrowser";

// KITS: phones the shop sells that are not in its own stock. Listed by the
// shop's EPOS exactly like Pre-Owned (one product per handset, real photos,
// condition out of 10, warranty countdown), so the page is the same browser.
export const metadata: Metadata = {
  title: "Kits: Phones in Multan",
  description:
    "Phone kits at United Mobiles, Multan: real photos of the exact phone, condition rated out of 10, PTA status and warranty shown.",
};

export default async function KitsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <CatalogBrowser
      title="Kits"
      basePath="/kits"
      fixed={{ category: "Kits" }}
      searchParams={await searchParams}
      showCondition={false}
      dense
    />
  );
}
