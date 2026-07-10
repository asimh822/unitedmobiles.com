import { KashiWatermark } from "@/components/KashiMotifs";

const TRUST_LINES = [
  "Genuine Products with Official Warranty",
  "Cash on Delivery",
  "Lowest Price Guaranteed",
  "Multan's Trusted Mobile Shop for Over a Decade",
];

/**
 * Hero with the animated trust-line reveal: checkmarks appear one after
 * another via staggered CSS-only animation. Plays once, no looping.
 */
/** Banner: top third of the viewport, trust-line reveal inside. */
export default function Hero() {
  return (
    <section className="relative flex min-h-[200px] flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark px-5 py-5 text-white sm:h-[28vh] sm:px-10">
      {/* kashi-kari paisley watermark — decorative, kept below 8% opacity */}
      <KashiWatermark className="pointer-events-none absolute -right-6 -top-8 h-[130%] text-white opacity-[0.07] sm:right-8" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-turq/20"
      />

      <div className="relative max-w-3xl">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
          Your Next Phone,{" "}
          <span className="text-gold-light">Delivered to Your Door.</span>
        </h1>
        <p className="mt-1.5 text-sm text-white/85 sm:text-base">
          Browse, tap Buy Now, and confirm on WhatsApp — pay cash when it arrives.
        </p>

        <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {TRUST_LINES.map((line, i) => (
            <li
              key={line}
              className="flex items-center gap-2 text-xs font-medium animate-trust-in sm:text-sm"
              style={{ animationDelay: `${0.35 + i * 0.45}s` }}
            >
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-turq text-[10px] font-black text-white">
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
