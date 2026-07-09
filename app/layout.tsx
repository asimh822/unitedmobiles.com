import type { Metadata } from "next";
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
        <header className="sticky top-0 z-40 border-b border-stone-200 bg-cream/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg font-black text-white">
                U
              </span>
              <span className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">
                United <span className="text-brand">Mobiles</span>
              </span>
            </Link>
            <span className="hidden text-sm font-medium text-stone-500 sm:block">
              Genuine phones. Cash on delivery.
            </span>
          </div>
          <NavMenu />
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
