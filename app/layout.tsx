import { PAYMENT } from "@/lib/payment";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import { KashiBorder } from "@/components/KashiMotifs";
import LocalBusinessJsonLd from "@/components/LocalBusinessJsonLd";
import NavMenu from "@/components/NavMenu";
import OpenStatus from "@/components/OpenStatus";
import PriceNotice from "@/components/PriceNotice";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { BUSINESS_ADDRESS, BUSINESS_PHONE } from "@/lib/business";
import { SITE_URL } from "@/lib/site";
import { buildChatLink } from "@/lib/whatsapp";
import "./globals.css";

// One typeface for the whole shop. The system default looked different on every
// device and flat everywhere; Manrope is clean, a little warm, and reads at 13px.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `United Mobiles, ${BUSINESS_ADDRESS.street}, ${BUSINESS_ADDRESS.locality}`,
)}`;

const FOOTER_LINKS: [string, string][] = [
  ["New Phones", "/new-phones"],
  ["Pre-Owned Phones", "/used"],
  ["Kits", "/kits"],
  ["KeyPad Phones", "/keypad-phones"],
  ["Tabs", "/tabs"],
  ["Build Your Phone", "/build"],
];

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
        {/* Phone: logo row on top (scrolls away), category tabs under it (stay
            pinned: the negative sticky offset is the logo row's height).
            From sm up: one row, logo beside the menu. */}
        <header className="sticky top-[-52px] z-40 border-b border-stone-200 bg-cream/95 backdrop-blur sm:top-0">
          <div className="mx-auto max-w-6xl px-3 sm:flex sm:items-center sm:gap-4 sm:px-4 sm:py-2">
            <div className="flex h-[52px] items-center justify-between gap-3 px-1 sm:h-auto sm:px-0">
              <Link href="/" className="shrink-0 transition-transform active:scale-95" aria-label="United Mobiles — home">
                <Image
                  src="/shop-logo.png"
                  alt="United Mobiles Multan"
                  width={640}
                  height={375}
                  priority
                  className="h-10 w-auto rounded-lg sm:h-11"
                />
              </Link>
              <div className="flex min-w-0 flex-col items-end text-[11px] leading-tight sm:hidden">
                <OpenStatus />
                <span className="truncate font-medium text-stone-500">Katchehry Road, Multan</span>
              </div>
            </div>
            <NavMenu />
            <span className="hidden shrink-0 whitespace-nowrap text-xs font-medium text-stone-500 xl:block">
              Genuine phones. {PAYMENT.short}.
            </span>
          </div>
          <KashiBorder id="kashi-header" />
        </header>

        <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 pb-16">{children}</main>

        <footer className="border-t border-stone-200 bg-white">
          <KashiBorder id="kashi-footer" />
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-stone-600 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-3">
              <Image src="/shop-logo.png" alt="United Mobiles Multan" width={640} height={375} className="h-12 w-auto rounded-lg" />
              <p className="max-w-xs">
                Official Vivo outlet and Multan&apos;s trusted mobile shop for over a decade. Genuine phones,
                official warranty, {PAYMENT.short.toLowerCase()}.
              </p>
              <OpenStatus className="text-xs" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-widest text-brand">Visit the shop</p>
              <p>
                {BUSINESS_ADDRESS.street},
                <br />
                {BUSINESS_ADDRESS.locality}, {BUSINESS_ADDRESS.region}
              </p>
              <p>Saturday to Thursday, 10:30 AM to 9:00 PM. Closed Friday.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-stone-200 px-3.5 py-1.5 text-xs font-bold text-ink transition-colors hover:border-brand/40 hover:text-brand"
                >
                  📍 Get directions
                </a>
                <a
                  href={`tel:${BUSINESS_PHONE}`}
                  className="rounded-full border border-stone-200 px-3.5 py-1.5 text-xs font-bold text-ink transition-colors hover:border-brand/40 hover:text-brand"
                >
                  📞 0310 9627000
                </a>
                <a
                  href={buildChatLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-wa-dark px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
                >
                  WhatsApp us
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-widest text-brand">Shop</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-semibold text-ink sm:grid-cols-1">
                {FOOTER_LINKS.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="transition-colors hover:text-brand">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="border-t border-stone-100 px-4 py-4 text-center text-xs text-stone-400">
            © {new Date().getFullYear()} United Mobiles, Multan
          </p>
        </footer>

        <LocalBusinessJsonLd />
        <PriceNotice />
        <WhatsAppFloat />
        <Analytics />
      </body>
    </html>
  );
}
