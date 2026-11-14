import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

interface Props {
  /** Product detail page. */
  href: string;
  /** e.g. "vivo V80" */
  name: string;
  /** Lowest variant price — shown as "From". */
  price: number;
  /** First sale day, "YYYY-MM-DD" (Pakistan time). Before it the slide says
   *  "Pre-book"; from that day on it flips to "Now in stock" on its own. */
  saleDate: string;
  /** Up to two 500x500 product shots on white (mix-blend drops the white). */
  images: { src: string; alt: string }[];
}

/**
 * Launch slide for a new model when there is no manufacturer key visual:
 * built from the catalog product shots on a soft mint panel.
 */
export default function LaunchSlide({ href, name, price, saleDate, images }: Props) {
  const day = new Date(`${saleDate}T00:00:00+05:00`);
  const live = Date.now() >= day.getTime();
  const dayLabel = day.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Karachi",
  });

  return (
    <Link
      href={href}
      className="group relative flex min-h-[200px] items-center gap-2 overflow-hidden rounded-3xl bg-gradient-to-br from-[#ecfdf5] via-[#d1fae5] to-[#99f6e4] px-5 py-5 text-ink sm:h-[28vh] sm:px-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-10 h-64 w-64 rounded-full bg-white/50 blur-2xl"
      />

      <div className="relative min-w-0 flex-1">
        <span className="inline-block rounded-full bg-[#047857] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
          {live ? "Just Launched" : "New Launch"}
        </span>
        <h2 className="mt-2 text-3xl font-extrabold leading-none tracking-tight sm:text-5xl">{name}</h2>
        <p className="mt-2 text-sm font-semibold text-[#065f46] sm:text-base">
          {live ? "Now in stock — order yours today." : `First sale ${dayLabel}. Be first in Multan.`}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold text-white shadow-md transition group-hover:bg-brand-dark">
            {live ? "Buy Now →" : "Pre-book Now →"}
          </span>
          <span className="text-sm font-bold">From {formatPrice(price)}</span>
        </div>
      </div>

      <div aria-hidden="true" className="relative flex h-full shrink-0 items-center">
        {images.slice(0, 2).map((img, i) => (
          <div
            key={img.src}
            className={`relative aspect-square h-32 transition-transform duration-300 group-hover:scale-105 sm:h-[26vh] ${
              i > 0 ? "hidden sm:-ml-[11vh] sm:block" : ""
            }`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 640px) 128px, 260px"
              className="object-contain mix-blend-multiply"
            />
          </div>
        ))}
      </div>
    </Link>
  );
}
