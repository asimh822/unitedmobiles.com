import Image from "next/image";
import Link from "next/link";
import { getProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { cardImage, effectivePrice } from "@/lib/types";

export interface UsedPromo {
  total: number;
  from: number | null;
  photos: { id: string; src: string; alt: string }[];
}

const PERKS = ["📸 Real photos", "⭐ Rated /10", "🛡️ Warranty shown"];

/**
 * Homepage carousel slide for the Used section (EPOS-fed since 14/11/2026).
 * Live: the stock count, the cheapest price and the three newest handsets'
 * 480px card photos (~5-30 KB each — never the full photos, see cardImage).
 * getUsedPromo() returns null when there is no used stock, and the page then
 * leaves the slide out — the carousel never advertises an empty shelf. (The
 * check lives in the page, not here: a slide that rendered null would still
 * occupy a blank slot and a dot in HeroCarousel.)
 */
export async function getUsedPromo(): Promise<UsedPromo | null> {
  const [newest, cheapest] = await Promise.all([
    getProducts({ category: "Used", stock: "in_stock", perPage: 3, sort: "newest" }),
    getProducts({ category: "Used", stock: "in_stock", perPage: 1, sort: "price_asc" }),
  ]);
  if (newest.total === 0) return null;

  const from = cheapest.products[0] ? effectivePrice(cheapest.products[0]) : null;
  const photos = newest.products
    .map((p) => ({ id: p.id, src: cardImage(p), alt: `${p.brand} ${p.model}` }))
    .filter((p): p is { id: string; src: string; alt: string } => Boolean(p.src));
  return { total: newest.total, from, photos };
}

export default function UsedPromoSlide({ total, from, photos }: UsedPromo) {
  // Fanned stack: back card left and tilted, front card upright on the right.
  // Phones show the first photo only; the fan needs desktop width.
  const fan = ["sm:-rotate-[10deg]", "hidden sm:block sm:z-10 sm:-ml-8", "hidden sm:block sm:rotate-[10deg] sm:-ml-8"];

  return (
    <Link
      href="/used"
      className="group relative flex min-h-[200px] items-center gap-3 overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-[#2a2420] to-gold-dark px-5 py-5 text-white sm:h-[28vh] sm:px-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/25 blur-2xl"
      />

      <div className="relative min-w-0 flex-1">
        <span className="inline-block rounded-full bg-gold-light px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink">
          New · Used Phones
        </span>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
          Used Phones.{" "}
          <span className="text-gold-light">Real Photos. Real Prices.</span>
        </h2>
        <p className="mt-1 text-sm text-white/80 sm:text-base">
          See the exact phone you&apos;ll get — checked and rated by our shop.
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-semibold sm:text-xs">
          {PERKS.map((p) => (
            <li key={p} className="rounded-full bg-white/10 px-2 py-0.5 ring-1 ring-white/20">
              {p}
            </li>
          ))}
        </ul>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold shadow-md transition group-hover:bg-brand-dark">
          {from ? `From ${formatPrice(from)}` : "Shop Used"} →
        </span>
        {/* A small count ("2 in stock") undersells the shelf — show it once it impresses. */}
        {total >= 5 && (
          <span className="ml-2 text-xs font-semibold text-white/70">{total} in stock</span>
        )}
      </div>

      {photos.length > 0 && (
        <div aria-hidden="true" className="relative flex shrink-0 items-center">
          {photos.map((p, i) => (
            <div
              key={p.id}
              className={`relative h-24 w-[4.5rem] overflow-hidden rounded-xl border-2 border-white bg-white shadow-xl transition-transform duration-300 group-hover:scale-105 sm:h-36 sm:w-28 ${
                photos.length === 1 ? "" : fan[i] ?? ""
              }`}
            >
              <Image src={p.src} alt={p.alt} fill sizes="112px" className="object-cover" />
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
