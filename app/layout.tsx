import { PAYMENT } from "@/lib/payment";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import { KashiBorder } from "@/components/KashiMotifs";
import LocalBusinessJsonLd from "@/components/LocalBusinessJsonLd";
import NavMenu from "@/components/NavMenu";
import PriceNotice from "@/components/PriceNotice";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// One typeface for the whole shop. The system default looked different on every
// device and flat everywhere; Manrope is clean, a little warm, and reads at 13px.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "United Mobiles — Official Vivo Outlet & Genuine Phones in Multan",
    template: "%s | United Mobiles",
  },
  description:
    "United Mobiles is an official Vivo outlet on Katchehry Road, Multan — genuine phones with official warranty, lowest price guaranteed, same-day delivery in Multan, small advance, rest cash on delivery. A trusted physical shop for over a decade.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="min-h-screen antialiased">
        {/* Single-row header: logo top-left, category menu beside it. */}
        <header className="sticky top-0 z-40 border-b border-stone-200 bg-cream/95 backdrop-blur relative">
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
            <span className="hidden shrink-0 whitespace-nowrap text-xs font-medium text-stone-500 lg:block">
              Genuine phones. {PAYMENT.short}.
            </span>
          </div>
          <KashiBorder id="kashi-header" />
        </header>

        <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 pb-16">{children}</main>

        <footer className="border-t border-stone-200 bg-white">
          <KashiBorder id="kashi-footer" />
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-ink">United Mobiles</p>
            <p>Genuine products • Official warranty • {PAYMENT.short}</p>
            <p>© {new Date().getFullYear()} United Mobiles</p>
          </div>
        </footer>

        <LocalBusinessJsonLd />
        <PriceNotice />
        <WhatsAppFloat />
        <Analytics />
      </body>
    </html>
  );
}
