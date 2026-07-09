import type { Metadata } from "next";
import BrandRows from "@/components/BrandRows";

export const metadata: Metadata = { title: "KeyPad Phones" };
export const revalidate = 300;

export default function KeypadPhonesPage() {
  return (
    <div className="space-y-5 py-6">
      <h1 className="text-2xl font-extrabold text-ink">KeyPad Phones</h1>
      <BrandRows category="KeyPad Phones" />
    </div>
  );
}
