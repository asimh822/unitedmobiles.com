import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import NavMenu from "@/components/NavMenu";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "United Mobiles — Genuine Phones, Best Prices in Pakistan",
    template: "%s | United Mobiles",
  },
  description:
    "United Mobiles — genuine mobile phones with official warranty, lowest price guaranteed, cash on delivery. A trusted physical shop for over a decade.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {/* Single-row header: logo top-left, category menu beside it. */}
        <header className="sticky top-0 z-40 border-b border-stone-200 bg-cream/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:gap-4">
            <Link href="/" className="shrink-0" aria-label="United Mobiles — home">
              <Image
                src="/shop-logo.png"
                alt="United Mobiles Multan"
                width={640}
                height={375}
                priority
                className="h-10 w-auto rounded-lg sm:h-11"
              />
            </Link>
            <NavMenu />
          </div>
        </header>

        <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 pb-16">{children}</main>

        <footer className="border-t border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-ink">United Mobiles</p>
            <p>Genuine products • Official warranty • Cash on delivery</p>
            <p>© {new Date().getFullYear()} United Mobiles</p>
          </div>
        </footer>

        <WhatsAppFloat />
        <Analytics />
      </body>
    </html>
  );
}
