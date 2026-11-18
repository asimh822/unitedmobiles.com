import type { Metadata } from "next";
import DreamPhoneBuilder from "@/components/build/DreamPhoneBuilder";
import { getBuildPhones } from "@/lib/build-data";

// Live shelf, refreshed like the product pages.
export const revalidate = 300;

const title = "Build Your Dream Phone";
const description =
  "Pick your style, shape your phone in 3D (screen, camera, battery, storage, speed, colour) and see the real phones on our shelf in Multan that match it best.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/build" },
  openGraph: { title: `${title} | United Mobiles`, description, type: "website" },
};

export default async function BuildPage() {
  const phones = await getBuildPhones();
  return <DreamPhoneBuilder phones={phones} />;
}
