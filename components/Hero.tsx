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
/** Slim banner — compact enough that the first brand row is fully visible. */
export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-dark px-5 py-4 text-white sm:px-8 sm:py-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-coral/20"
      />

      <div className="relative">
        <h1 className="text-lg font-extrabold leading-tight sm:text-2xl">
          Your Next Phone, <span className="text-orange-300">Delivered to Your Door.</span>
        </h1>

        <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:mt-3 sm:grid-cols-4">
          {TRUST_LINES.map((line, i) => (
            <li
              key={line}
              className="flex items-center gap-1.5 text-[11px] font-medium animate-trust-in sm:text-xs"
              style={{ animationDelay: `${0.35 + i * 0.45}s` }}
            >
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-coral text-[9px] font-black text-white">
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
