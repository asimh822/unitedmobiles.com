import type { Metadata } from "next";
import BrandRows from "@/components/BrandRows";

export const metadata: Metadata = { title: "New Phones" };
export const revalidate = 300;

export default function NewPhonesPage() {
  return (
    <div className="space-y-5 py-6">
      <h1 className="sr-only">New Phones</h1>
      <BrandRows category="New Phones" />
    </div>
  );
}
