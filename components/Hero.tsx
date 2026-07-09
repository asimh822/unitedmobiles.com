const TRUST_LINES = [
  "Genuine Products with Official Warranty",
  "Cash on Delivery",
  "Lowest Price Guaranteed",
  "Physical Shop for Over a Decade",
];

/**
 * Hero with the animated trust-line reveal: checkmarks appear one after
 * another via staggered CSS-only animation. Plays once, no looping.
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark px-5 py-10 text-white sm:px-10 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-coral/20"
      />

      <div className="relative max-w-2xl">
        <p className="mb-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
          United Mobiles
        </p>
        <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
          Your Next Phone,
          <br />
          <span className="text-orange-300">Delivered to Your Door.</span>
        </h1>
        <p className="mt-3 max-w-lg text-sm text-teal-50 sm:text-base">
          Browse, tap Buy Now, and confirm on WhatsApp — pay cash when it arrives.
        </p>

        <ul className="mt-6 space-y-2.5">
          {TRUST_LINES.map((line, i) => (
            <li
              key={line}
              className="flex items-center gap-2.5 text-sm font-medium animate-trust-in sm:text-base"
              style={{ animationDelay: `${0.35 + i * 0.45}s` }}
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-coral text-[11px] font-black text-white">
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
