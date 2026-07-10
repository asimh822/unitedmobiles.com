import type { Metadata } from "next";
import BrandRows from "@/components/BrandRows";

export const metadata: Metadata = { title: "Tabs" };
export const revalidate = 300;

export default function TabsPage() {
  return (
    <div className="space-y-5 py-6">
      <h1 className="sr-only">Tabs</h1>
      <BrandRows category="Tabs" />
    </div>
  );
}
